import { Card } from './Card'
import { SeverityBadge } from './SeverityBadge'
import { Severity } from '@/lib/supabase'

interface Alert {
  id: string
  time: string
  message: string
  severity?: Severity
  busId?: string
  busFleetNumber?: string
}

interface LiveAlertsProps {
  alerts: Alert[]
}

export function LiveAlerts({ alerts }: LiveAlertsProps) {
  return (
    <Card title="Live Alerts">
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-sm text-textMuted">No recent alerts</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 pb-3 border-b border-borderLight last:border-0">
              <div className="flex-shrink-0">
                <div className="text-xs text-textMuted font-medium">{alert.time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-textMain">{alert.message}</p>
                {alert.severity && (
                  <div className="mt-1">
                    <SeverityBadge severity={alert.severity} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

