import { AppShell } from '@/components/layout/AppShell'
import { ForecastDisplay } from '@/components/ForecastDisplay'
import { AIForecastButtons } from '@/components/AIForecastButtons'
import { AIChatbot } from '@/components/AIChatbot'
import { supabase } from '@/lib/supabase'

export default async function ForecastsPage() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const fourteenDaysFromNow = new Date()
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)
  fourteenDaysFromNow.setHours(0, 0, 0, 0)

  const { data: forecasts } = await supabase
    .from('forecast_snapshots')
    .select('*')
    .gte('target_date', tomorrow.toISOString())
    .lte('target_date', fourteenDaysFromNow.toISOString())
    .order('target_date', { ascending: true })

  const transformedForecasts = forecasts?.map((f: any) => ({
    id: f.id,
    dateGenerated: f.date_generated,
    targetDate: f.target_date,
    availableBusCount: f.available_bus_count,
    unavailableBusCount: f.unavailable_bus_count,
    highRiskBusCount: f.high_risk_bus_count,
    metadata: f.metadata,
  })) || []

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

