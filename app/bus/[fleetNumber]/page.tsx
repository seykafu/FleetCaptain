import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { SuccessBanner } from '@/components/SuccessBanner'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/Card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BusDetailPageProps {
  params: {
    fleetNumber: string
  }
}

export default async function BusDetailPage({ params }: BusDetailPageProps) {
  // Get bus with garage
  const { data: bus, error: busError } = await supabase
    .from('buses')
    .select(`
      *,
      garages!inner(id, name, code)
    `)
    .eq('fleet_number', params.fleetNumber)
    .single()

  if (busError || !bus) {
    notFound()
  }

  // Get maintenance events (fetch separately for reliability)
  const { data: maintenanceEventsRaw } = await supabase
    .from('maintenance_events')
    .select('*')
    .eq('bus_id', bus.id)
    .order('started_at', { ascending: false })

  // Get garages for maintenance events
  const garageIds = maintenanceEventsRaw?.map(e => e.garage_id).filter(Boolean) || []
  let garageMap = new Map()
  if (garageIds.length > 0) {
    const { data: maintenanceGarages } = await supabase
      .from('garages')
      .select('id, name, code')
      .in('id', garageIds)
    
    garageMap = new Map((maintenanceGarages || []).map(g => [g.id, g]))
  }

  // Transform maintenance events to include garage info
  const maintenanceEvents = maintenanceEventsRaw?.map((event: any) => ({
    ...event,
    garages: garageMap.get(event.garage_id) || null,
  })) || []

  // Get incidents (fetch separately for reliability)
  const { data: incidentsRaw } = await supabase
    .from('incidents')
    .select('*')
    .eq('bus_id', bus.id)
    .order('reported_at', { ascending: false })

  // Get garages for incidents
  const incidentGarageIds = incidentsRaw?.map(i => i.garage_id).filter(Boolean) || []
  let incidentGarageMap = new Map()
  if (incidentGarageIds.length > 0) {
    const { data: incidentGarages } = await supabase
      .from('garages')
      .select('id, name, code')
      .in('id', incidentGarageIds)
    
    incidentGarageMap = new Map((incidentGarages || []).map(g => [g.id, g]))
  }

  // Transform incidents to include garage info
  const incidents = incidentsRaw?.map((incident: any) => ({
    ...incident,
    garages: incidentGarageMap.get(incident.garage_id) || null,
  })) || []

  return (
    <AppShell pageTitle={`Bus ${bus.fleet_number}`}>
      <div className="space-y-6">
        <Suspense fallback={null}>
          <SuccessBanner />
        </Suspense>

        <div className="flex items-center justify-between">
          <div></div>
          <Link
            href={`/bus/${bus.fleet_number}/log-issue`}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Log Issue
          </Link>
        </div>

        <Card title="Bus Details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-textMuted uppercase tracking-wide mb-1">Status</dt>
              <dd>
                <StatusBadge status={bus.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-textMuted uppercase tracking-wide mb-1">Garage</dt>
              <dd className="text-sm text-textMain font-medium">{bus.garages.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-textMuted uppercase tracking-wide mb-1">Mileage</dt>
              <dd className="text-sm text-textMain font-medium">{bus.mileage?.toLocaleString() ?? 'N/A'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Maintenance History">
          {!maintenanceEvents || maintenanceEvents.length === 0 ? (
            <p className="text-sm text-textMuted">No maintenance events recorded.</p>
          ) : (
            <div className="space-y-4">
              {maintenanceEvents.map((event: any) => (
                <div key={event.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-textMain">{event.type}</span>
                    <SeverityBadge severity={event.severity} />
                    <StatusBadge status={event.status} variant="maintenance" />
                  </div>
                  <p className="text-sm text-textMuted mb-2">{event.description}</p>
                  <div className="text-xs text-textMuted space-y-1">
                    <div>Garage: {event.garages?.name || 'N/A'}</div>
                    <div>Mechanic: {event.mechanic_name}</div>
                    <div>Started: {new Date(event.started_at).toLocaleString()}</div>
                    {event.completed_at && (
                      <div>Completed: {new Date(event.completed_at).toLocaleString()}</div>
                    )}
                    {event.parts_used && <div>Parts: {event.parts_used}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Incidents">
          {!incidents || incidents.length === 0 ? (
            <p className="text-sm text-textMuted">No incidents recorded.</p>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident: any) => (
                <div key={incident.id} className="border-l-4 border-statusRed pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <p className="text-sm text-textMuted mb-2">{incident.description}</p>
                  <div className="text-xs text-textMuted space-y-1">
                    <div>Reported by: {incident.reported_by}</div>
                    <div>Garage: {incident.garages?.name || 'N/A'}</div>
                    <div>Reported: {new Date(incident.reported_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
