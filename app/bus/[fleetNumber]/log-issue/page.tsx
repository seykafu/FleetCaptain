import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/Card'
import { notFound } from 'next/navigation'
import { LogIssueForm } from '@/components/LogIssueForm'

interface LogIssuePageProps {
  params: {
    fleetNumber: string
  }
}

export default async function LogIssuePage({ params }: LogIssuePageProps) {
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

  const { data: garages } = await supabase
    .from('garages')
    .select('*')
    .order('name')

  // Transform bus to match expected format
  const transformedBus = {
    id: bus.id,
    fleetNumber: bus.fleet_number,
    garageId: bus.garage_id,
    status: bus.status,
    mileage: bus.mileage,
    createdAt: bus.created_at,
    updatedAt: bus.updated_at,
    garage: bus.garages,
  }

  return (
    <AppShell pageTitle={`Log Issue - Bus ${bus.fleet_number}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card title="Bus Information">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-textMain">Fleet Number:</span>{' '}
              <span className="text-textMuted">{bus.fleet_number}</span>
            </div>
            <div>
              <span className="font-medium text-textMain">Current Status:</span>{' '}
              <span className="text-textMuted">{bus.status}</span>
            </div>
            <div>
              <span className="font-medium text-textMain">Current Garage:</span>{' '}
              <span className="text-textMuted">{bus.garages.name}</span>
            </div>
          </div>
        </Card>

        <LogIssueForm bus={transformedBus} garages={garages || []} />
      </div>
    </AppShell>
  )
}
