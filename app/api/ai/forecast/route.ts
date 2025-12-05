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

    console.log('Forecast API - Current fleet status:', {
      totalBuses,
      availableBuses,
      inMaintenance,
      outOfService,
    })

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

IMPORTANT: The current fleet has ${totalBuses} total buses with ${availableBuses} currently available. Your predictions should be realistic based on this baseline.

Based on this data, predict:
1. Available bus count for ${targetDateStr} (should be a number between 0 and ${totalBuses}, typically close to ${availableBuses} unless maintenance trends suggest otherwise)
2. Unavailable bus count (in maintenance + out of service) - should be ${totalBuses} minus available count
3. High-risk bus count (buses likely to need maintenance) - typically 5-15% of total fleet
4. Brief reasoning for your predictions

Respond in JSON format ONLY (no other text):
{
  "availableBusCount": <number>,
  "unavailableBusCount": <number>,
  "highRiskBusCount": <number>,
  "reasoning": "<brief explanation of your predictions>"
}`

    // Call OpenAI - try with JSON mode first, fallback to regular if not supported
    let completion
    try {
      // Try with gpt-4o-mini which supports JSON mode
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert fleet management analyst. Provide accurate predictions based on historical data and trends. Always respond with ONLY valid JSON, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })
    } catch (jsonModeError: any) {
      // If JSON mode fails, try without it
      if (jsonModeError.message?.includes('response_format')) {
        console.log('JSON mode not supported, trying without it...')
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert fleet management analyst. Provide accurate predictions based on historical data and trends. Always respond with ONLY valid JSON, no additional text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
        })
      } else {
        throw jsonModeError
      }
    }

    // Parse the response - it should be JSON
    let aiResponse: any = {}
    try {
      const content = completion.choices[0].message.content || '{}'
      // Try to extract JSON if there's any extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0])
      } else {
        aiResponse = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback: try to extract numbers from the response
      const content = completion.choices[0].message.content || ''
      const availableMatch = content.match(/available[:\s]+(\d+)/i)
      const unavailableMatch = content.match(/unavailable[:\s]+(\d+)/i)
      const highRiskMatch = content.match(/high[-\s]?risk[:\s]+(\d+)/i)
      
      aiResponse = {
        availableBusCount: availableMatch ? parseInt(availableMatch[1]) : 0,
        unavailableBusCount: unavailableMatch ? parseInt(unavailableMatch[1]) : 0,
        highRiskBusCount: highRiskMatch ? parseInt(highRiskMatch[1]) : 0,
        reasoning: content,
      }
    }

    // Ensure we have valid numbers - use fallback if AI didn't provide good data
    let availableCount = Number(aiResponse.availableBusCount) || 0
    let unavailableCount = Number(aiResponse.unavailableBusCount) || 0
    let highRiskCount = Number(aiResponse.highRiskBusCount) || 0

    // Fallback: if AI returned all zeros or invalid data, use current fleet status as baseline
    if (availableCount === 0 && unavailableCount === 0 && totalBuses > 0) {
      console.warn('AI returned invalid data, using current fleet status as fallback')
      // Use current status as baseline, adjust slightly based on trends
      const maintenanceTrend = recentMaintenance > 0 ? Math.min(recentMaintenance / 10, 0.1) : 0
      availableCount = Math.max(0, Math.floor(availableBuses * (1 - maintenanceTrend)))
      unavailableCount = totalBuses - availableCount
      highRiskCount = Math.max(1, Math.floor(totalBuses * 0.1)) // Assume 10% high risk
    }

    // Ensure totals add up correctly
    if (availableCount + unavailableCount !== totalBuses && totalBuses > 0) {
      // Adjust to match total
      const total = availableCount + unavailableCount
      if (total > 0) {
        availableCount = Math.floor((availableCount / total) * totalBuses)
        unavailableCount = totalBuses - availableCount
      } else {
        availableCount = availableBuses
        unavailableCount = totalBuses - availableCount
      }
    }

    // Save forecast to database
    const { data: forecast, error: forecastError } = await supabase
      .from('forecast_snapshots')
      .insert({
        target_date: targetDate.toISOString(),
        available_bus_count: availableCount,
        unavailable_bus_count: unavailableCount,
        high_risk_bus_count: highRiskCount,
        metadata: {
          reasoning: aiResponse.reasoning || 'AI-generated forecast',
          generatedBy: 'AI',
          daysAhead: days,
        },
      })
      .select()
      .single()

    if (forecastError) {
      console.error('Failed to save forecast:', forecastError)
      throw new Error(`Failed to save forecast: ${forecastError.message}`)
    }

    console.log('Forecast saved:', {
      targetDate: targetDate.toISOString(),
      available: availableCount,
      unavailable: unavailableCount,
      highRisk: highRiskCount,
    })

    return NextResponse.json({
      success: true,
      forecast: {
        targetDate: targetDate.toISOString(),
        availableBusCount: availableCount,
        unavailableBusCount: unavailableCount,
        highRiskBusCount: highRiskCount,
        reasoning: aiResponse.reasoning || 'AI-generated forecast',
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

