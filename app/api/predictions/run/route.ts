import { NextResponse } from 'next/server'
import { predictionEngine } from '@/lib/predictionEngine'
import { supabase } from '@/lib/supabase'
import { notifyForecastUpdate } from '@/lib/twilio'

export async function POST() {
  try {
    // Generate forecasts for next 7 days
    const forecasts = await predictionEngine.generateForecast(7)

    // Store forecasts (delete old ones for same dates first)
    for (const forecast of forecasts) {
      // Delete existing forecasts for this target date
      await supabase
        .from('forecast_snapshots')
        .delete()
        .eq('target_date', forecast.targetDate.toISOString())

      // Create new forecast
      await supabase.from('forecast_snapshots').insert({
        target_date: forecast.targetDate.toISOString(),
        available_bus_count: forecast.availableBusCount,
        unavailable_bus_count: forecast.unavailableBusCount,
        high_risk_bus_count: forecast.highRiskBusCount,
        metadata: {
          highRiskBuses: forecast.highRiskBuses,
        },
      })
    }

    // Check for availability drop
    const dropCheck = await predictionEngine.checkAvailabilityDrop()
    if (dropCheck.shouldAlert && dropCheck.message) {
      await notifyForecastUpdate(dropCheck.message)
    }

    return NextResponse.json({
      success: true,
      forecasts: forecasts.length,
      message: dropCheck.shouldAlert ? dropCheck.message : undefined,
    })
  } catch (error) {
    console.error('Failed to run predictions:', error)
    return NextResponse.json(
      { error: 'Failed to run predictions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
