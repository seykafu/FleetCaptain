'use client'

import { StatusBadge } from './StatusBadge'
import { SeverityBadge } from './SeverityBadge'
import { Card } from './Card'
import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
// Using simple text indicators for sorting

type SortField = 'bus' | 'issue' | 'severity' | 'status' | 'garage' | 'mechanic' | 'started' | null
type SortDirection = 'asc' | 'desc' | null

interface MaintenanceBacklogProps {
  events: Array<{
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
  }>
}

export function MaintenanceBacklog({ events: initialEvents }: MaintenanceBacklogProps) {
  const [events, setEvents] = useState(initialEvents)
  const [filterGarage, setFilterGarage] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const filteredEvents = events.filter((event) => {
    if (filterGarage !== 'all' && event.garageId !== filterGarage) return false
    if (filterSeverity !== 'all' && event.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && event.status !== filterStatus) return false
    return true
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'bus':
        aValue = a.bus?.fleetNumber || ''
        bValue = b.bus?.fleetNumber || ''
        break
      case 'issue':
        aValue = a.description.toLowerCase()
        bValue = b.description.toLowerCase()
        break
      case 'severity':
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0
        bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0
        break
      case 'status':
        const statusOrder = { NEW: 1, IN_PROGRESS: 2, COMPLETED: 3, UPDATE: 4 }
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0
        break
      case 'garage':
        aValue = a.garage?.name || ''
        bValue = b.garage?.name || ''
        break
      case 'mechanic':
        aValue = a.mechanicName.toLowerCase()
        bValue = b.mechanicName.toLowerCase()
        break
      case 'started':
        aValue = new Date(a.startedAt).getTime()
        bValue = new Date(b.startedAt).getTime()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const uniqueGarages = Array.from(
    new Map(
      events
        .filter((e) => e.garage !== null)
        .map((e) => [e.garage!.id, e.garage!])
    ).values()
  )

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/maintenance/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updated = await response.json()
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e))
        )
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <Card 
      title="Maintenance Backlog"
      headerAction={
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-textMuted hover:text-textMain transition-colors"
          aria-label={isExpanded ? 'Collapse table' : 'Expand table'}
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Expand
            </>
          )}
        </button>
      }
    >
      {isExpanded && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
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
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-sm border border-borderLight rounded-lg px-3 py-2 bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
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
          <option value="UPDATE">Update</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FBFF] border-b border-borderLight">
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('bus')}
              >
                <div className="flex items-center gap-1">
                  Bus
                  {sortField === 'bus' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('issue')}
              >
                <div className="flex items-center gap-1">
                  Issue
                  {sortField === 'issue' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('severity')}
              >
                <div className="flex items-center gap-1">
                  Severity
                  {sortField === 'severity' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('garage')}
              >
                <div className="flex items-center gap-1">
                  Garage
                  {sortField === 'garage' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('mechanic')}
              >
                <div className="flex items-center gap-1">
                  Mechanic
                  {sortField === 'mechanic' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('started')}
              >
                <div className="flex items-center gap-1">
                  Started
                  {sortField === 'started' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderLight">
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-textMuted">
                  No maintenance events found matching the selected filters.
                </td>
              </tr>
            ) : (
              sortedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-textMain">
                    {event.bus?.fleetNumber || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-textMuted">
                    {event.description}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SeverityBadge severity={event.severity as any} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={event.status} variant="maintenance" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                    {event.garage?.name || 'N/A'}
                  </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {event.mechanicName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {new Date(event.startedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {event.status === 'NEW' && (
                    <button
                      onClick={() => handleStatusChange(event.id, 'IN_PROGRESS')}
                      className="text-xs px-3 py-1 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {event.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange(event.id, 'COMPLETED')}
                      className="text-xs px-3 py-1 rounded-full bg-statusGreen text-white hover:bg-statusGreen/90 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </Card>
  )
}
