import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ForecastRequest {
  days: number // 1, 7, or 14
}

export async function POST(request: NextRequest) {
  try {
    const body: ForecastRequest = await request.json()
    const { days } = body

    if (![1, 7, 14].includes(days)) {
      return NextResponse.json(
        { error: 'Days must be 1, 7, or 14' },
        { status: 400 }
      )
    }

    // Fetch current fleet data
    const { data: buses } = await supabase
      .from('buses')
      .select('id, fleet_number, status, garage_id, mileage')

    const { data: maintenanceEvents } = await supabase
      .from('maintenance_events')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)

    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .order('reported_at', { ascending: false })
      .limit(100)

    const { data: garages } = await supabase
      .from('garages')
      .select('id, name, code')

    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('*')

    // Calculate current metrics
    const totalBuses = buses?.length || 0
    const availableBuses = buses?.filter(b => b.status === 'AVAILABLE').length || 0
    const inMaintenance = buses?.filter(b => b.status === 'IN_MAINTENANCE').length || 0
    const outOfService = buses?.filter(b => b.status === 'OUT_OF_SERVICE').length || 0

    // Calculate trends
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentMaintenance = maintenanceEvents?.filter(
      (e: any) => new Date(e.started_at) >= thirtyDaysAgo
    ).length || 0
    const recentIncidents = incidents?.filter(
      (i: any) => new Date(i.reported_at) >= thirtyDaysAgo
    ).length || 0

    // Prepare data summary for AI
    const dataSummary = {
      fleet: {
        total: totalBuses,
        available: availableBuses,
        inMaintenance,
        outOfService,
        utilizationRate: totalBuses > 0 ? ((availableBuses / totalBuses) * 100).toFixed(1) : 0,
      },
      recentActivity: {
        maintenanceEventsLast30Days: recentMaintenance,
        incidentsLast30Days: recentIncidents,
      },
      garages: garages?.map(g => ({ name: g.name, code: g.code })) || [],
      inventory: {
        totalItems: inventory?.length || 0,
        lowStockItems: inventory?.filter(i => i.quantity <= i.reorder_threshold).length || 0,
      },
      maintenanceEvents: maintenanceEvents?.slice(0, 20).map((e: any) => ({
        bus: buses?.find(b => b.id === e.bus_id)?.fleet_number,
        type: e.type,
        severity: e.severity,
        status: e.status,
        startedAt: e.started_at,
      })) || [],
      incidents: incidents?.slice(0, 20).map((i: any) => ({
        bus: buses?.find(b => b.id === i.bus_id)?.fleet_number,
        severity: i.severity,
        reportedAt: i.reported_at,
      })) || [],
    }

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const targetDateStr = targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    // Create AI prompt
    const prompt = `You are a fleet management AI assistant. Analyze the following fleet data and predict bus availability for ${targetDateStr} (${days} ${days === 1 ? 'day' : 'days'} from now).

Current Fleet Status:
- Total Buses: ${dataSummary.fleet.total}
- Available: ${dataSummary.fleet.available}
- In Maintenance: ${dataSummary.fleet.inMaintenance}
- Out of Service: ${dataSummary.fleet.outOfService}
- Utilization Rate: ${dataSummary.fleet.utilizationRate}%

Recent Activity (Last 30 Days):
- Maintenance Events: ${dataSummary.recentActivity.maintenanceEventsLast30Days}
- Incidents: ${dataSummary.recentActivity.incidentsLast30Days}

Recent Maintenance Events:
${dataSummary.maintenanceEvents.map((e: any) => 
  `- Bus ${e.bus}: ${e.type} (${e.severity}), Status: ${e.status}, Started: ${new Date(e.startedAt).toLocaleDateString()}`
).join('\n')}

Recent Incidents:
${dataSummary.incidents.map((i: any) => 
  `- Bus ${i.bus}: ${i.severity} severity, Reported: ${new Date(i.reportedAt).toLocaleDateString()}`
).join('\n')}

Inventory Status:
- Total Parts: ${dataSummary.inventory.totalItems}
- Low Stock Items: ${dataSummary.inventory.lowStockItems}

Based on this data, predict:
1. Available bus count for ${targetDateStr}
2. Unavailable bus count (in maintenance + out of service)
3. High-risk bus count (buses likely to need maintenance)
4. Brief reasoning for your predictions

Respond in JSON format:
{
  "availableBusCount": <number>,
  "unavailableBusCount": <number>,
  "highRiskBusCount": <number>,
  "reasoning": "<brief explanation of your predictions>"
}`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert fleet management analyst. Provide accurate predictions based on historical data and trends. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

    // Save forecast to database
    const { data: forecast, error: forecastError } = await supabase
      .from('forecast_snapshots')
      .insert({
        target_date: targetDate.toISOString(),
        available_bus_count: aiResponse.availableBusCount || 0,
        unavailable_bus_count: aiResponse.unavailableBusCount || 0,
        high_risk_bus_count: aiResponse.highRiskBusCount || 0,
        metadata: {
          reasoning: aiResponse.reasoning,
          generatedBy: 'AI',
          daysAhead: days,
        },
      })
      .select()
      .single()

    if (forecastError) {
      console.error('Failed to save forecast:', forecastError)
    }

    return NextResponse.json({
      success: true,
      forecast: {
        targetDate: targetDate.toISOString(),
        availableBusCount: aiResponse.availableBusCount,
        unavailableBusCount: aiResponse.unavailableBusCount,
        highRiskBusCount: aiResponse.highRiskBusCount,
        reasoning: aiResponse.reasoning,
      },
    })
  } catch (error) {
    console.error('AI forecast error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate AI forecast',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

