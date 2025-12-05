import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory = [] } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Fetch ALL fleet data for context
    const [busesResult, maintenanceResult, incidentsResult, garagesResult, inventoryResult, maintenanceUsersResult, busFollowsResult, forecastsResult] = await Promise.all([
      supabase.from('buses').select('*'), // All buses, all fields
      supabase.from('maintenance_events').select('*').order('started_at', { ascending: false }),
      supabase.from('incidents').select('*').order('reported_at', { ascending: false }),
      supabase.from('garages').select('*'),
      supabase.from('inventory_items').select('*'),
      supabase.from('maintenance_users').select('*'),
      supabase.from('bus_follows').select('*'),
      supabase.from('forecast_snapshots').select('*').order('target_date', { ascending: false }).limit(30), // Recent forecasts
    ])

    const buses = busesResult.data || []
    const maintenanceEvents = maintenanceResult.data || []
    const incidents = incidentsResult.data || []
    const garages = garagesResult.data || []
    const inventory = inventoryResult.data || []
    const maintenanceUsers = maintenanceUsersResult.data || []
    const busFollows = busFollowsResult.data || []
    const forecasts = forecastsResult.data || []

    // Calculate summary statistics
    const totalBuses = buses.length
    const availableBuses = buses.filter(b => b.status === 'AVAILABLE').length
    const inMaintenance = buses.filter(b => b.status === 'IN_MAINTENANCE').length
    const outOfService = buses.filter(b => b.status === 'OUT_OF_SERVICE').length

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentMaintenance = maintenanceEvents.filter(
      (e: any) => new Date(e.started_at) >= thirtyDaysAgo
    ).length
    const recentIncidents = incidents.filter(
      (i: any) => new Date(i.reported_at) >= thirtyDaysAgo
    ).length

    // Calculate high-risk buses (same logic as prediction engine)
    const HIGH_RISK_INCIDENT_THRESHOLD = 3
    const HIGH_RISK_MAINTENANCE_THRESHOLD = 2
    
    const highRiskBuses: Array<{ fleetNumber: string; reason: string; incidents: number; openCriticalHigh: number }> = []
    
    for (const bus of buses) {
      const busMaintenanceEvents = maintenanceEvents.filter((e: any) => e.bus_id === bus.id) || []
      const busIncidents = incidents.filter((i: any) => i.bus_id === bus.id) || []
      
      const recentBusIncidents = busIncidents.filter(
        (i: any) => new Date(i.reported_at) >= thirtyDaysAgo
      )
      
      const openCriticalHigh = busMaintenanceEvents.filter(
        (event: any) =>
          event.status !== 'COMPLETED' &&
          (event.severity === 'CRITICAL' || event.severity === 'HIGH')
      ).length

      const reasons: string[] = []
      
      if (recentBusIncidents.length >= HIGH_RISK_INCIDENT_THRESHOLD) {
        reasons.push(`${recentBusIncidents.length} incidents in last 30 days`)
      }
      
      if (openCriticalHigh >= HIGH_RISK_MAINTENANCE_THRESHOLD) {
        reasons.push(`${openCriticalHigh} open critical/high maintenance events`)
      }
      
      if (reasons.length > 0) {
        highRiskBuses.push({
          fleetNumber: bus.fleet_number,
          reason: reasons.join('; '),
          incidents: recentBusIncidents.length,
          openCriticalHigh: openCriticalHigh,
        })
      }
    }

    // Create detailed data summary for AI
    const busStatusBreakdown = {
      AVAILABLE: buses.filter(b => b.status === 'AVAILABLE').length,
      IN_MAINTENANCE: buses.filter(b => b.status === 'IN_MAINTENANCE').length,
      OUT_OF_SERVICE: buses.filter(b => b.status === 'OUT_OF_SERVICE').length,
    }

    const garageBusCounts = garages.map(g => ({
      name: g.name,
      count: buses.filter(b => b.garage_id === g.id).length,
    }))

    // Create system prompt with FULL database context
    const systemPrompt = `You are an AI assistant for FleetCaptain, a fleet management system. You have access to ALL real-time fleet data.

Database Schema:
- buses: id, fleet_number, status (AVAILABLE/IN_MAINTENANCE/OUT_OF_SERVICE), garage_id, mileage, created_at, updated_at
- maintenance_events: id, bus_id, garage_id, mechanic_name, type, severity, description, status, started_at, completed_at, parts_used
- incidents: id, bus_id, garage_id, reported_by, severity, description, reported_at, linked_maintenance_event_id
- garages: id, name, code (NORTH/SOUTH)
- inventory_items: id, name, part_number, quantity, reorder_threshold, garage_id
- maintenance_users: id, name, email, phone
- bus_follows: user_id, bus_id (tracks which users follow which buses)
- forecast_snapshots: target_date, available_bus_count, unavailable_bus_count, high_risk_bus_count, metadata

Current Fleet Summary:
- Total Buses: ${totalBuses}
- Available: ${availableBuses}
- In Maintenance: ${inMaintenance}
- Out of Service: ${outOfService}
- Maintenance Events: ${maintenanceEvents.length} total, ${recentMaintenance} in last 30 days
- Incidents: ${incidents.length} total, ${recentIncidents} in last 30 days
- Garages: ${garages.map(g => `${g.name} (${buses.filter(b => b.garage_id === g.id).length} buses)`).join(', ')}
- Inventory Items: ${inventory.length} total, ${inventory.filter(i => i.quantity <= i.reorder_threshold).length} low stock
- Maintenance Users: ${maintenanceUsers.length}
- Bus Follows: ${busFollows.length} active follows
- Recent Forecasts: ${forecasts.length} available
- High-Risk Buses: ${highRiskBuses.length} identified

HIGH-RISK BUSES (${highRiskBuses.length} total):
${highRiskBuses.length > 0 
  ? highRiskBuses.map(b => `- Bus ${b.fleetNumber}: ${b.reason} (${b.incidents} recent incidents, ${b.openCriticalHigh} open critical/high events)`).join('\n')
  : 'No high-risk buses identified at this time.'}

You have access to ALL ${totalBuses} buses with complete data including:
- All bus fleet numbers, statuses, garage assignments, and mileage
- Complete maintenance history for all buses
- All incident reports
- Full inventory data
- All maintenance users and their contact info
- Bus follow relationships
- Forecast data

You can answer questions about:
- Specific buses by fleet number (you have access to ALL buses)
- High-risk buses (listed above) - you have the complete list with reasons
- Bus status and availability across the entire fleet
- Maintenance history and trends for any bus
- Incident reports and patterns
- Inventory levels and low stock alerts
- Garage operations and bus assignments
- Forecasts and predictions
- Fleet health metrics
- Maintenance user information
- Bus follow relationships

IMPORTANT: You have REAL-TIME access to all the data above. When asked about high-risk buses, use the list provided above. When asked about specific buses, look them up in the bus data provided. Do NOT say you don't have database access - you have full access to all the data listed above.

Be helpful, concise, and data-driven. When asked about specific buses, you can look up their complete history. Always provide actionable insights when possible.`

    // Include actual bus data in context (limit to first 100 for very large fleets to avoid token limits)
    const busDataForContext = buses.slice(0, 100).map(b => ({
      fleet_number: b.fleet_number,
      status: b.status,
      garage: garages.find(g => g.id === b.garage_id)?.name || 'Unknown',
      mileage: b.mileage,
    }))

    const dataContext = totalBuses <= 100 
      ? `\n\nComplete Bus Data (${totalBuses} buses):\n${JSON.stringify(busDataForContext, null, 2)}`
      : `\n\nSample Bus Data (first 100 of ${totalBuses} buses):\n${JSON.stringify(busDataForContext, null, 2)}\n\nNote: You have access to all ${totalBuses} buses in the database.`

    // Build conversation history
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt + dataContext,
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0].message.content

    return NextResponse.json({
      success: true,
      response: aiResponse,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

