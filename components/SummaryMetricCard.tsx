interface SummaryMetricCardProps {
  label: string
  value: number | string
  statusColor: 'green' | 'yellow' | 'red' | 'blue'
  trend?: 'up' | 'down' | null
  subtitle?: string
}

export function SummaryMetricCard({ label, value, statusColor, trend, subtitle }: SummaryMetricCardProps) {
  const colorClasses = {
    green: 'bg-statusGreen',
    yellow: 'bg-statusYellow',
    red: 'bg-statusRed',
    blue: 'bg-primary',
  }

  return (
    <div className="bg-white rounded-xl border border-borderLight shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colorClasses[statusColor]}`}></span>
          <span className="text-xs uppercase tracking-wide text-textMuted font-medium">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-statusGreen' : 'text-statusRed'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className="text-3xl font-semibold text-textMain mb-1">{value}</div>
      {subtitle && <div className="text-xs text-textMuted">{subtitle}</div>}
    </div>
  )
}

