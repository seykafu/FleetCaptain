import { Card } from './Card'

interface ForecastDisplayProps {
  forecasts: Array<{
    id: string
    dateGenerated: string
    targetDate: string
    availableBusCount: number
    unavailableBusCount: number
    highRiskBusCount: number
    metadata?: any
  }>
}

export function ForecastDisplay({ forecasts }: ForecastDisplayProps) {
  if (forecasts.length === 0) {
    return (
      <Card title="Forecast History" subtitle="Historical forecast snapshots">
        <p className="text-sm text-textMuted mb-4">No forecast data available. Use the AI forecast buttons above to generate predictions.</p>
      </Card>
    )
  }

  return (
    <Card title="Forecast History" subtitle="Historical forecast snapshots (up to 14 days)">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#F9FBFF] border-b border-borderLight">
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Available
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Unavailable
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                High Risk
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderLight">
            {forecasts.map((forecast) => {
              // Ensure we have valid numbers
              const available = Number(forecast.availableBusCount) || 0
              const unavailable = Number(forecast.unavailableBusCount) || 0
              const highRisk = Number(forecast.highRiskBusCount) || 0
              
              return (
                <tr key={forecast.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-textMain">
                    {new Date(forecast.targetDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-statusGreen">
                    {available}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-statusRed">
                    {unavailable}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600">
                    {highRisk}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {forecasts.length > 0 && (
        <div className="mt-4 text-xs text-textMuted">
          Showing {forecasts.length} forecast snapshot{forecasts.length !== 1 ? 's' : ''}. Use AI forecast buttons above to generate new predictions.
        </div>
      )}
    </Card>
  )
}
