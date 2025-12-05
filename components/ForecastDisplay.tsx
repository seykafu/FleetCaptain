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
      <Card title="7-Day Forecast" subtitle="Bus availability predictions for the next week">
        <p className="text-sm text-textMuted mb-4">No forecast data available. Run predictions to generate forecast.</p>
        <form action="/api/predictions/run" method="POST">
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Generate Forecast
          </button>
        </form>
      </Card>
    )
  }

  return (
    <Card title="7-Day Forecast" subtitle="Bus availability predictions for the next week">
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
            {forecasts.map((forecast) => (
              <tr key={forecast.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMain">
                  {new Date(forecast.targetDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-statusGreen">
                  {forecast.availableBusCount}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-statusRed">
                  {forecast.unavailableBusCount}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600">
                  {forecast.highRiskBusCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <form action="/api/predictions/run" method="POST">
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Refresh Forecast
          </button>
        </form>
      </div>
    </Card>
  )
}
