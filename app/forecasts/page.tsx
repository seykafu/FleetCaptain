import { AppShell } from '@/components/layout/AppShell'
import { ForecastDisplay } from '@/components/ForecastDisplay'
import { AIForecastButtons } from '@/components/AIForecastButtons'
import { AIChatbot } from '@/components/AIChatbot'
import { supabase } from '@/lib/supabase'

export default async function ForecastsPage() {
  // Get historical data going back 60 days and future data up to 14 days
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 60) // 60 days ago
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 14) // 14 days from now
  endDate.setHours(0, 0, 0, 0)

  // Fetch forecasts - get all recent ones and group by target_date (take most recent for each date)
  const { data: allForecasts } = await supabase
    .from('forecast_snapshots')
    .select('*')
    .gte('target_date', startDate.toISOString())
    .lte('target_date', endDate.toISOString())
    .order('date_generated', { ascending: false })

  // Group by target_date and take the most recent forecast for each date
  const forecastsByDate = new Map<string, any>()
  allForecasts?.forEach((f: any) => {
    const dateKey = f.target_date
    if (!forecastsByDate.has(dateKey)) {
      forecastsByDate.set(dateKey, f)
    } else {
      // Keep the most recent one
      const existing = forecastsByDate.get(dateKey)
      if (new Date(f.date_generated) > new Date(existing.date_generated)) {
        forecastsByDate.set(dateKey, f)
      }
    }
  })

  // Convert to array and sort by target_date
  const transformedForecasts = Array.from(forecastsByDate.values())
    .map((f: any) => ({
      id: f.id,
      dateGenerated: f.date_generated,
      targetDate: f.target_date,
      availableBusCount: f.available_bus_count || 0,
      unavailableBusCount: f.unavailable_bus_count || 0,
      highRiskBusCount: f.high_risk_bus_count || 0,
      metadata: f.metadata,
    }))
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())

  return (
    <AppShell pageTitle="Forecasts">
      <div className="space-y-6">
        {/* AI Forecast Buttons */}
        <AIForecastButtons />

        {/* Chatbot and Forecast Display Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast Display */}
          <div>
            <ForecastDisplay forecasts={transformedForecasts} />
          </div>

          {/* AI Chatbot */}
          <div>
            <AIChatbot />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

