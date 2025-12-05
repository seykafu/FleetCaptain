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

    // Fetch current fleet data for context
    const [busesResult, maintenanceResult, incidentsResult, garagesResult, inventoryResult] = await Promise.all([
      supabase.from('buses').select('id, fleet_number, status, garage_id, mileage').limit(50),
      supabase.from('maintenance_events').select('*').order('started_at', { ascending: false }).limit(50),
      supabase.from('incidents').select('*').order('reported_at', { ascending: false }).limit(50),
      supabase.from('garages').select('id, name, code'),
      supabase.from('inventory_items').select('*'),
    ])

    const buses = busesResult.data || []
    const maintenanceEvents = maintenanceResult.data || []
    const incidents = incidentsResult.data || []
    const garages = garagesResult.data || []
    const inventory = inventoryResult.data || []

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

    // Create system prompt with database context
    const systemPrompt = `You are an AI assistant for FleetCaptain, a fleet management system. You have access to real-time fleet data.

Database Schema:
- buses: id, fleet_number, status (AVAILABLE/IN_MAINTENANCE/OUT_OF_SERVICE), garage_id, mileage
- maintenance_events: id, bus_id, garage_id, mechanic_name, type, severity, description, status, started_at, completed_at
- incidents: id, bus_id, garage_id, reported_by, severity, description, reported_at
- garages: id, name, code (NORTH/SOUTH)
- inventory_items: id, name, part_number, quantity, reorder_threshold, garage_id
- forecast_snapshots: target_date, available_bus_count, unavailable_bus_count, high_risk_bus_count

Current Fleet Summary:
- Total Buses: ${totalBuses}
- Available: ${availableBuses}
- In Maintenance: ${inMaintenance}
- Out of Service: ${outOfService}
- Maintenance Events (Last 30 Days): ${recentMaintenance}
- Incidents (Last 30 Days): ${recentIncidents}
- Garages: ${garages.map(g => g.name).join(', ')}
- Inventory Items: ${inventory.length} total, ${inventory.filter(i => i.quantity <= i.reorder_threshold).length} low stock

You can answer questions about:
- Bus status and availability
- Maintenance history and trends
- Incident reports
- Inventory levels
- Garage operations
- Forecasts and predictions
- Fleet health metrics

Be helpful, concise, and data-driven. If asked about specific buses, use the fleet_number. Always provide actionable insights when possible.`

    // Build conversation history
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
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

