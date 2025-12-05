import { BusStatus, MaintenanceStatus } from '@/lib/supabase'

interface StatusBadgeProps {
  status: BusStatus | MaintenanceStatus | string
  variant?: 'bus' | 'maintenance'
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  // Bus statuses
  AVAILABLE: { color: 'text-statusGreen', bg: 'bg-green-50', label: 'Available' },
  IN_MAINTENANCE: { color: 'text-statusYellow', bg: 'bg-yellow-50', label: 'In Maintenance' },
  OUT_OF_SERVICE: { color: 'text-statusRed', bg: 'bg-red-50', label: 'Out of Service' },
  // Maintenance statuses
  NEW: { color: 'text-primary', bg: 'bg-blue-50', label: 'New' },
  IN_PROGRESS: { color: 'text-statusYellow', bg: 'bg-yellow-50', label: 'In Progress' },
  COMPLETED: { color: 'text-statusGreen', bg: 'bg-green-50', label: 'Completed' },
}

export function StatusBadge({ status, variant = 'bus' }: StatusBadgeProps) {
  const config = statusConfig[status] || { color: 'text-gray-600', bg: 'bg-gray-50', label: status }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`}></span>
      {config.label}
    </span>
  )
}
