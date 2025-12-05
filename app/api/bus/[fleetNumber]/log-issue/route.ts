import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notifyIncident, notifyBusInGarage, notifyForecastUpdate, notifyBusFollowers } from '@/lib/twilio'
import { predictionEngine } from '@/lib/predictionEngine'

export async function POST(
  request: NextRequest,
  { params }: { params: { fleetNumber: string } }
) {
  try {
    const body = await request.json()
    const { 
      type = 'INCIDENT', 
      severity = 'MEDIUM', 
      description, 
      mechanicName, 
      takeIntoGarage = true, 
      garageId, 
      partsUsed,
      busStatus // New: explicit bus status from form
    } = body

    if (!description || !mechanicName) {
      return NextResponse.json(
        { error: 'Description and mechanic name are required' },
        { status: 400 }
      )
    }

    // Find bus by fleet number
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('*')
      .eq('fleet_number', params.fleetNumber)
      .single()

    if (busError || !bus) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 })
    }

    // Use provided garageId, or fall back to bus's current garage
    const finalGarageId = garageId || bus.garage_id
    
    if (!finalGarageId) {
      return NextResponse.json(
        { error: 'Garage ID is required' },
        { status: 400 }
      )
    }

    // Create incident if type is INCIDENT
    let incidentId: string | undefined
    if (type === 'INCIDENT') {
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          bus_id: bus.id,
          garage_id: finalGarageId,
          reported_by: mechanicName,
          severity,
          description,
        })
        .select()
        .single()

      if (!incidentError && incident) {
        incidentId = incident.id

        // Send SMS notification for incidents
        if (severity === 'CRITICAL' || severity === 'HIGH') {
          await notifyIncident(bus.fleet_number, severity, description)
        }
      }
    }

    // Determine maintenance event status based on bus status
    const maintenanceStatus = busStatus === 'IN_MAINTENANCE' ? 'IN_PROGRESS' : 'NEW'
    
    // Create maintenance event
    const { data: maintenanceEvent, error: eventError } = await supabase
      .from('maintenance_events')
      .insert({
        bus_id: bus.id,
        garage_id: finalGarageId,
        mechanic_name: mechanicName,
        type,
        severity,
        description,
        parts_used: partsUsed || null,
        started_at: new Date().toISOString(),
        status: maintenanceStatus,
      })
      .select()
      .single()

    if (eventError || !maintenanceEvent) {
      console.error('Failed to create maintenance event:', eventError)
      return NextResponse.json(
        { error: 'Failed to create maintenance event', details: eventError?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    console.log('Maintenance event created successfully:', maintenanceEvent.id, 'for bus:', bus.fleet_number)

    // Auto-follow: Find maintenance user by name and make them follow this bus
    if (mechanicName) {
      const { data: mechanicUser } = await supabase
        .from('maintenance_users')
        .select('id')
        .ilike('name', mechanicName.trim())
        .limit(1)
        .single()

      if (mechanicUser) {
        // Check if already following
        const { data: existingFollow } = await supabase
          .from('bus_follows')
          .select('id')
          .eq('user_id', mechanicUser.id)
          .eq('bus_id', bus.id)
          .single()

        // Auto-follow if not already following
        if (!existingFollow) {
          await supabase
            .from('bus_follows')
            .insert({
              user_id: mechanicUser.id,
              bus_id: bus.id,
            })
        }
      }
    }

    // Always update bus status and garage (not just when taken into garage)
    const updateData: { status: string; garage_id: string } = {
      status: busStatus || (takeIntoGarage ? 'IN_MAINTENANCE' : bus.status),
      garage_id: finalGarageId,
    }

    const { error: updateError } = await supabase
      .from('buses')
      .update(updateData)
      .eq('id', bus.id)

    if (updateError) {
      console.error('Failed to update bus status/garage:', updateError)
      // Don't fail the request, but log the error
    }

    // Send notification if bus is being taken into garage
    if (busStatus === 'IN_MAINTENANCE' || takeIntoGarage) {
      const { data: garage } = await supabase
        .from('garages')
        .select('name')
        .eq('id', finalGarageId)
        .single()

      if (garage) {
        await notifyBusInGarage(bus.fleet_number, garage.name)
      }
    }

    // Notify all followers of this bus about the update
    const { data: garage } = await supabase
      .from('garages')
      .select('name')
      .eq('id', finalGarageId)
      .single()

    const updateMessage = `${mechanicName} logged: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}${garage ? `\nGarage: ${garage.name}` : ''}\nStatus: ${busStatus}`
    
    console.log(`[log-issue] Calling notifyBusFollowers for bus ${bus.fleet_number} (ID: ${bus.id})`)
    await notifyBusFollowers(bus.id, bus.fleet_number, updateMessage)
    console.log(`[log-issue] Completed notifyBusFollowers call`)

    // Link incident to maintenance event if created
    if (incidentId && maintenanceEvent.id) {
      await supabase
        .from('incidents')
        .update({ linked_maintenance_event_id: maintenanceEvent.id })
        .eq('id', incidentId)
    }

    // Re-run predictions if critical incident
    if (severity === 'CRITICAL') {
      try {
        const forecasts = await predictionEngine.generateForecast(7)
        for (const forecast of forecasts) {
          await supabase.from('forecast_snapshots').insert({
            target_date: forecast.targetDate.toISOString(),
            available_bus_count: forecast.availableBusCount,
            unavailable_bus_count: forecast.unavailableBusCount,
            high_risk_bus_count: forecast.highRiskBusCount,
            metadata: { highRiskBuses: forecast.highRiskBuses },
          })
        }

        // Check for availability drop
        const dropCheck = await predictionEngine.checkAvailabilityDrop()
        if (dropCheck.shouldAlert && dropCheck.message) {
          await notifyForecastUpdate(dropCheck.message)
        }
      } catch (error) {
        console.error('Failed to update predictions:', error)
        // Don't fail the request if prediction fails
      }
    }

    return NextResponse.json({ success: true, maintenanceEvent })
  } catch (error) {
    console.error('Failed to log issue:', error)
    return NextResponse.json(
      { error: 'Failed to log issue', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
