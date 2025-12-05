import { Card } from './Card'
import Link from 'next/link'

interface HighRiskBus {
  busId: string
  fleetNumber: string
  reason: string
  riskPercentage?: number
}

interface HighRiskFleetProps {
  buses: HighRiskBus[]
}

export function HighRiskFleet({ buses }: HighRiskFleetProps) {
  if (buses.length === 0) {
    return (
      <Card title="AI-Identified High-Risk Fleet" subtitle="Buses likely to require repairs in the next 48 hours.">
        <p className="text-sm text-textMuted">No high-risk buses identified at this time.</p>
      </Card>
    )
  }

  return (
    <Card title="AI-Identified High-Risk Fleet" subtitle="Buses likely to require repairs in the next 48 hours.">
      <div className="space-y-3">
        {buses.slice(0, 5).map((bus) => (
          <Link
            key={bus.busId}
            href={`/bus/${bus.fleetNumber}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-b border-borderLight last:border-0"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {bus.fleetNumber.split('-')[1] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-textMain">Bus {bus.fleetNumber}</span>
                <span className="text-xs text-textMuted">— Risk {bus.riskPercentage || 82}%</span>
              </div>
              <p className="text-xs text-textMuted truncate">{bus.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-statusRed">{bus.riskPercentage || 82}%</div>
              <div className="text-xs text-textMuted">High</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}

