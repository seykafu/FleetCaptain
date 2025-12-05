import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/StatusBadge'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/Card'
import { CreateBusForm } from '@/components/CreateBusForm'
import Link from 'next/link'

export default async function BusesPage() {
  // Fetch buses without join first (more reliable)
  const { data: buses, error: busesError } = await supabase
    .from('buses')
    .select('*')
    .order('fleet_number', { ascending: true })

  // Fetch garages separately
  const { data: garages, error: garagesError } = await supabase
    .from('garages')
    .select('id, name, code')
    .order('name')

  if (busesError) {
    console.error('Error fetching buses:', busesError)
  }

  if (garagesError) {
    console.error('Error fetching garages:', garagesError)
  }

  // Debug logging
  console.log('Buses fetched:', buses?.length || 0)
  console.log('Garages fetched:', garages?.length || 0)
  if (buses && buses.length > 0) {
    console.log('Sample bus:', buses[0])
  }

  // Create a map of garage IDs to garage objects for quick lookup
  const garageMap = new Map((garages || []).map(g => [g.id, g]))

  // Transform buses to include garage information
  const transformedBuses = (buses || []).map((bus: any) => {
    const garage = bus.garage_id ? garageMap.get(bus.garage_id) : null
    
    return {
      ...bus,
      garage: garage || null,
    }
  })

  return (
    <AppShell pageTitle="Buses">
      <div className="space-y-6">
        {/* Create Bus Form */}
        <Card>
          <CreateBusForm garages={garages || []} />
        </Card>

        {/* Buses Table */}
        <Card>
          {busesError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Warning:</strong> There was an error loading buses. Showing available data.
              {busesError.message && <div className="mt-1 text-xs">Error: {busesError.message}</div>}
            </div>
          )}
          <div className="overflow-x-auto">
            {transformedBuses.length > 0 && (
              <div className="mb-4 text-sm text-textMuted">
                Showing {transformedBuses.length} bus{transformedBuses.length !== 1 ? 'es' : ''}
              </div>
            )}
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#F9FBFF] border-b border-borderLight">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Fleet Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Garage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Mileage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight">
                {transformedBuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-textMuted">
                      <div className="space-y-2">
                        <p>No buses found. Create your first bus using the form above.</p>
                        {!busesError && (
                          <p className="text-xs text-textMuted">
                            (No error detected. Check browser console for debug info.)
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  transformedBuses.map((bus: any) => (
                    <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-textMain">
                        {bus.fleet_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={bus.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                        {bus.garage?.name || bus.garages?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                        {bus.mileage?.toLocaleString() ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link
                          href={`/bus/${bus.fleet_number}`}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
