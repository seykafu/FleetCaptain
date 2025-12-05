import { Severity } from '@/lib/supabase'

const severityConfig: Record<Severity, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-statusRed', bg: 'bg-red-50' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-50' },
  MEDIUM: { color: 'text-statusYellow', bg: 'bg-yellow-50' },
  LOW: { color: 'text-primary', bg: 'bg-blue-50' },
}

interface SeverityBadgeProps {
  severity: Severity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity]

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`}></span>
      {severity}
    </span>
  )
}
