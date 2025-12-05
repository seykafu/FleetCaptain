import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notifyRepairCompleted, notifyBusFollowers } from '@/lib/twilio'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status } = body

    // Get maintenance event
    const { data: maintenanceEvent, error: eventError } = await supabase
      .from('maintenance_events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (eventError || !maintenanceEvent) {
      return NextResponse.json({ error: 'Maintenance event not found' }, { status: 404 })
    }

    const updateData: any = { status }

    // If completing, set completed_at
    if (status === 'COMPLETED' && !maintenanceEvent.completed_at) {
      updateData.completed_at = new Date().toISOString()

      // Update bus status to AVAILABLE
      await supabase
        .from('buses')
        .update({ status: 'AVAILABLE' })
        .eq('id', maintenanceEvent.bus_id)

      // Get garage name and bus fleet number for notification
      const [garageResult, busResult] = await Promise.all([
        supabase
          .from('garages')
          .select('name')
          .eq('id', maintenanceEvent.garage_id)
          .single(),
        supabase
          .from('buses')
          .select('fleet_number')
          .eq('id', maintenanceEvent.bus_id)
          .single(),
      ])

      if (garageResult.data && busResult.data) {
        // Send SMS notification to ops manager
        await notifyRepairCompleted(
          busResult.data.fleet_number,
          garageResult.data.name
        )
        
        // Notify all followers that maintenance was completed
        const updateMessage = `Maintenance completed: ${maintenanceEvent.description?.substring(0, 100) || 'Maintenance event'}${maintenanceEvent.description && maintenanceEvent.description.length > 100 ? '...' : ''}\nGarage: ${garageResult.data.name}\nStatus: COMPLETED`
        await notifyBusFollowers(maintenanceEvent.bus_id, busResult.data.fleet_number, updateMessage)
      }
    }

    // Notify followers of any status change (not just completion)
    if (status && status !== maintenanceEvent.status) {
      const { data: busResult } = await supabase
        .from('buses')
        .select('fleet_number')
        .eq('id', maintenanceEvent.bus_id)
        .single()('id', maintenanceEvent.bus_id)
        .single()
      
      if (busResult) {
        const updateMessage = `Maintenance status updated: ${maintenanceEvent.description?.substring(0, 100) || 'Maintenance event'}${maintenanceEvent.description && maintenanceEvent.description.length > 100 ? '...' : ''}\nStatus: ${status}`
        await notifyBusFollowers(maintenanceEvent.bus_id, busResult.fleet_number, updateMessage)
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('maintenance_events')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update maintenance event' },
        { status: 500 }
      )
    }

    // Transform to match expected format
    const transformed = {
      id: updated.id,
      busId: updated.bus_id,
      garageId: updated.garage_id,
      mechanicName: updated.mechanic_name,
      type: updated.type,
      severity: updated.severity,
      description: updated.description,
      partsUsed: updated.parts_used,
      startedAt: updated.started_at,
      completedAt: updated.completed_at,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to update maintenance event:', error)
    return NextResponse.json(
      { error: 'Failed to update maintenance event' },
      { status: 500 }
    )
  }
}
