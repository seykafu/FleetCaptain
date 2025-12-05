import { supabase, Severity } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { FleetHealthSummary } from '@/components/FleetHealthSummary'
import { MaintenanceBacklog } from '@/components/MaintenanceBacklog'
import { InventoryTable } from '@/components/InventoryTable'
import { HighRiskFleet } from '@/components/HighRiskFleet'
import { LiveAlerts } from '@/components/LiveAlerts'
import { predictionEngine } from '@/lib/predictionEngine'

export default async function DashboardPage() {
  // Get all buses (fetch separately for reliability)
  const { data: buses, error: busesError } = await supabase
    .from('buses')
    .select('*')
    .order('fleet_number', { ascending: true })

  // Get garages for matching
  const { data: garages } = await supabase
    .from('garages')
    .select('id, name, code')

  // Create garage map
  const garageMap = new Map((garages || []).map(g => [g.id, g]))

  // Get maintenance events
  const { data: maintenanceEventsRaw, error: maintenanceError } = await supabase
    .from('maintenance_events')
    .select('*')
    .in('status', ['NEW', 'IN_PROGRESS'])
    .order('started_at', { ascending: false })

  // Get buses for maintenance events
  const busIds = maintenanceEventsRaw?.map(e => e.bus_id).filter(Boolean) || []
  let busMap = new Map()
  if (busIds.length > 0) {
    const { data: maintenanceBuses } = await supabase
      .from('buses')
      .select('id, fleet_number')
      .in('id', busIds)
    
    busMap = new Map((maintenanceBuses || []).map(b => [b.id, b]))
  }

  // Transform maintenance events
  const maintenanceEvents = maintenanceEventsRaw?.map((event: any) => ({
    ...event,
    buses: busMap.get(event.bus_id) || null,
    garages: garageMap.get(event.garage_id) || null,
  })) || []

  if (busesError) {
    console.error('Error fetching buses:', busesError)
  }

  if (maintenanceError) {
    console.error('Error fetching maintenance events:', maintenanceError)
  }

  // Debug logging
  console.log('Dashboard - Buses fetched:', buses?.length || 0)
  console.log('Dashboard - Garages fetched:', garages?.length || 0)
  console.log('Dashboard - Maintenance events:', maintenanceEvents?.length || 0)

  const totalBuses = buses?.length || 0
  const availableBuses = buses?.filter((b) => b.status === 'AVAILABLE').length || 0
  const inMaintenance = buses?.filter((b) => b.status === 'IN_MAINTENANCE').length || 0
  const outOfService = buses?.filter((b) => b.status === 'OUT_OF_SERVICE').length || 0

  // Get latest forecast for tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const { data: tomorrowForecasts } = await supabase
    .from('forecast_snapshots')
    .select('*')
    .eq('target_date', tomorrow.toISOString())
    .order('date_generated', { ascending: false })
    .limit(1)

  const tomorrowForecast = tomorrowForecasts?.[0]

  // Get high-risk buses from prediction engine
  let highRiskBuses: Array<{ busId: string; fleetNumber: string; reason: string; riskPercentage?: number }> = []
  try {
    const forecast = await predictionEngine.predictForDate(tomorrow)
    highRiskBuses = forecast.highRiskBuses.map((bus) => ({
      ...bus,
      riskPercentage: Math.floor(Math.random() * 20) + 70, // Mock risk percentage
    }))
  } catch (error) {
    console.error('Failed to get high-risk buses:', error)
  }

  // Get recent alerts from notification logs
  const { data: notifications } = await supabase
    .from('notification_logs')
    .select('*, buses(fleet_number)')
    .order('sent_at', { ascending: false })
    .limit(10)

  const alerts = notifications?.map((notif: any) => ({
    id: notif.id,
    time: new Date(notif.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    message: notif.message,
    severity: (notif.type === 'INCIDENT' ? 'CRITICAL' : 'MEDIUM') as Severity,
    busFleetNumber: notif.buses?.fleet_number,
  })) || []

  // Transform maintenance events to match expected format
  const transformedEvents = maintenanceEvents?.map((event: any) => ({
    id: event.id,
    busId: event.bus_id,
    garageId: event.garage_id,
    mechanicName: event.mechanic_name,
    type: event.type,
    severity: event.severity,
    description: event.description,
    partsUsed: event.parts_used,
    startedAt: event.started_at,
    completedAt: event.completed_at,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    bus: event.buses ? {
      id: event.buses.id,
      fleetNumber: event.buses.fleet_number,
    } : null,
    garage: event.garages || null,
  })) || []

  return (
    <AppShell pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Summary Metrics */}
        <FleetHealthSummary
          totalBuses={totalBuses}
          availableBuses={availableBuses}
          inMaintenance={inMaintenance}
          outOfService={outOfService}
          predictedAvailableTomorrow={tomorrowForecast?.available_bus_count}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* High-Risk Fleet */}
            <HighRiskFleet buses={highRiskBuses} />

            {/* Inventory */}
            <InventoryTable />
          </div>

          {/* Right Column - Live Alerts */}
          <div className="lg:col-span-1">
            <LiveAlerts alerts={alerts} />
          </div>
        </div>

        {/* Maintenance Backlog - Full Width */}
        <div className="mt-6">
          <MaintenanceBacklog events={transformedEvents} />
        </div>
      </div>
    </AppShell>
  )
}
