'use client'

import { useState, useMemo } from 'react'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'
import { SeverityBadge } from './SeverityBadge'

interface MaintenanceEvent {
  id: string
  busId: string
  garageId: string
  mechanicName: string
  type: string
  severity: string
  description: string
  partsUsed?: string | null
  startedAt: string
  completedAt?: string | null
  status: string
  bus: {
    id: string
    fleetNumber: string
  } | null
  garage: {
    id: string
    name: string
    code: string
  } | null
}

interface MaintenanceHistoryProps {
  events: MaintenanceEvent[]
}

export function MaintenanceHistory({ events: initialEvents }: MaintenanceHistoryProps) {
  const [events] = useState(initialEvents)
  const [filterGarage, setFilterGarage] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const uniqueGarages = useMemo(() => {
    const garagesMap = new Map<string, { id: string; name: string; code: string }>()
    initialEvents.forEach((e) => {
      if (e.garage) {
        garagesMap.set(e.garage.id, e.garage)
      }
    })
    return Array.from(garagesMap.values())
  }, [initialEvents])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterGarage !== 'all' && event.garageId !== filterGarage) return false
      if (filterStatus !== 'all' && event.status !== filterStatus) return false
      if (filterType !== 'all' && event.type !== filterType) return false
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          event.bus?.fleetNumber.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.mechanicName.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
  }, [events, filterGarage, filterStatus, filterType, searchTerm])

  return (
    <Card title="Maintenance History" subtitle="Complete history of all maintenance events">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bus, description, or mechanic..."
            className="flex-1 min-w-[200px] border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={filterGarage}
            onChange={(e) => setFilterGarage(e.target.value)}
            className="text-sm border border-borderLight rounded-lg px-3 py-2 bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Garages</option>
            {uniqueGarages.map((garage) => (
              <option key={garage.id} value={garage.id}>
                {garage.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-borderLight rounded-lg px-3 py-2 bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-borderLight rounded-lg px-3 py-2 bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="INCIDENT">Incident</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="REPAIR">Repair</option>
            <option value="INSPECTION">Inspection</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#F9FBFF] border-b border-borderLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Bus
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Mechanic
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Garage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Parts Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLight">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-textMuted">
                    No maintenance events found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                      <div>{new Date(event.startedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-textMuted">
                        {new Date(event.startedAt).toLocaleTimeString()}
                      </div>
                      {event.completedAt && (
                        <div className="text-xs text-statusGreen mt-1">
                          Completed: {new Date(event.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-textMain">
                      {event.bus?.fleetNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                      {event.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-textMuted max-w-md">
                      <div className="truncate" title={event.description}>
                        {event.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={event.severity as any} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={event.status} variant="maintenance" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                      {event.mechanicName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                      {event.garage?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                      {event.partsUsed || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="text-sm text-textMuted">
          Showing {filteredEvents.length} of {events.length} maintenance events
        </div>
      </div>
    </Card>
  )
}

