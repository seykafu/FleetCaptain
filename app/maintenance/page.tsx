import { AppShell } from '@/components/layout/AppShell'
import { MaintenanceHistory } from '@/components/MaintenanceHistory'
import { supabase } from '@/lib/supabase'

export default async function MaintenancePage() {
  // Fetch all maintenance events
  const { data: maintenanceEventsRaw } = await supabase
    .from('maintenance_events')
    .select('*')
    .order('started_at', { ascending: false })

  // Get unique bus IDs and garage IDs
  const busIds = [...new Set(maintenanceEventsRaw?.map(e => e.bus_id).filter(Boolean) || [])]
  const garageIds = [...new Set(maintenanceEventsRaw?.map(e => e.garage_id).filter(Boolean) || [])]

  // Fetch buses and garages separately
  let busMap = new Map()
  let garageMap = new Map()

  if (busIds.length > 0) {
    const { data: buses } = await supabase
      .from('buses')
      .select('id, fleet_number')
      .in('id', busIds)
    
    busMap = new Map((buses || []).map(b => [b.id, b]))
  }

  if (garageIds.length > 0) {
    const { data: garages } = await supabase
      .from('garages')
      .select('id, name, code')
      .in('id', garageIds)
    
    garageMap = new Map((garages || []).map(g => [g.id, g]))
  }

  // Transform maintenance events
  const maintenanceEvents = maintenanceEventsRaw?.map((event: any) => ({
    ...event,
    bus: busMap.get(event.bus_id) || null,
    garage: garageMap.get(event.garage_id) || null,
  })) || []

  return (
    <AppShell pageTitle="Maintenance">
      <MaintenanceHistory events={maintenanceEvents} />
    </AppShell>
  )
}

