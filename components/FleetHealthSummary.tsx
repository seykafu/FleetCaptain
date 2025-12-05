import { SummaryMetricCard } from './SummaryMetricCard'

interface FleetHealthSummaryProps {
  totalBuses: number
  availableBuses: number
  inMaintenance: number
  outOfService: number
  predictedAvailableTomorrow?: number
}

export function FleetHealthSummary({
  totalBuses,
  availableBuses,
  inMaintenance,
  outOfService,
  predictedAvailableTomorrow,
}: FleetHealthSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryMetricCard
        label="Available"
        value={availableBuses}
        statusColor="green"
      />
      <SummaryMetricCard
        label="In Maintenance"
        value={inMaintenance}
        statusColor="yellow"
      />
      <SummaryMetricCard
        label="Expected Tomorrow"
        value={predictedAvailableTomorrow ?? 'N/A'}
        statusColor="blue"
        trend={predictedAvailableTomorrow && predictedAvailableTomorrow > availableBuses ? 'up' : predictedAvailableTomorrow && predictedAvailableTomorrow < availableBuses ? 'down' : null}
      />
      <SummaryMetricCard
        label="Out of Service"
        value={outOfService}
        statusColor="red"
      />
    </div>
  )
}
