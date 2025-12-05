import { supabase } from '@/lib/supabase'
import { QuickLogForm } from '@/components/QuickLogForm'
import { redirect } from 'next/navigation'

interface QuickLogPageProps {
  params: {
    fleetNumber: string
  }
}

export default async function QuickLogPage({ params }: QuickLogPageProps) {
  // Normalize fleet number (uppercase, trim)
  const normalizedFleetNumber = params.fleetNumber.toUpperCase().trim()

  // Ensure garages exist first - try multiple approaches
  let garages: any[] = []
  let garagesError: any = null

  // First attempt: fetch garages
  const { data: fetchedGarages, error: fetchError } = await supabase
    .from('garages')
    .select('*')
    .order('name')

  console.log('Quick-log: Initial garage fetch - count:', fetchedGarages?.length || 0, 'error:', fetchError?.message)

  if (fetchError) {
    console.error('Error fetching garages:', fetchError)
    garagesError = fetchError
  } else {
    garages = fetchedGarages || []
  }

  // If no garages found, try to create them
  if (garages.length === 0) {
    console.log('No garages found, attempting to create default garages...')
    
    // Try creating both garages
    const garagePromises = [
      supabase
        .from('garages')
        .upsert({
          code: 'NORTH',
          name: 'North Garage',
        }, {
          onConflict: 'code',
        })
        .select()
        .single(),
      supabase
        .from('garages')
        .upsert({
          code: 'SOUTH',
          name: 'South Garage',
        }, {
          onConflict: 'code',
        })
        .select()
        .single()
    ]

    const results = await Promise.all(garagePromises)
    
    const northResult = results[0]
    const southResult = results[1]

    if (northResult.error) {
      console.error('Error creating North Garage:', northResult.error)
    } else {
      console.log('North Garage created/found:', northResult.data?.id)
    }

    if (southResult.error) {
      console.error('Error creating South Garage:', southResult.error)
    } else {
      console.log('South Garage created/found:', southResult.data?.id)
    }

    // Re-fetch garages after creation attempt (with retry)
    let retries = 3
    let updatedGarages: any[] = []
    
    while (retries > 0 && updatedGarages.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const { data: refetched, error: refetchError } = await supabase
        .from('garages')
        .select('*')
        .order('name')
      
      if (refetchError) {
        console.error(`Error refetching garages (attempt ${4 - retries}):`, refetchError)
        garagesError = refetchError
      } else {
        updatedGarages = refetched || []
        console.log(`After creation attempt (attempt ${4 - retries}) - garages found:`, updatedGarages.length)
        if (updatedGarages.length > 0) {
          break
        }
      }
      retries--
    }
    
    garages = updatedGarages
  }

  // If no garages after all attempts, use empty array (form will handle it)
  if (!garages || garages.length === 0) {
    console.error('No garages available - form will show with empty garage list')
    garages = []
  }

  console.log('Quick-log: Successfully loaded', garages.length, 'garages')

  // Try to find bus - fetch without join first (more reliable)
  const { data: allBuses, error: busesError } = await supabase
    .from('buses')
    .select('*')

  if (busesError) {
    console.error('Error fetching buses:', busesError)
  }

  // Find bus with case-insensitive matching
  let bus = allBuses?.find(
    (b) => b.fleet_number.toUpperCase().trim() === normalizedFleetNumber
  )

  // If bus not found, automatically create it
  if (!bus) {
    // Determine which garage to assign based on fleet number pattern
    // For new buses, default to North Garage (or you could make it configurable)
    const defaultGarage = garages.find(g => g.code === 'NORTH') || garages[0]

    // If no default garage, use empty string - form will handle it
    if (!defaultGarage) {
      console.warn('No garage available to assign new bus - will use empty garage ID')
    }

    const { data: newBus, error: createError } = await supabase
      .from('buses')
      .insert({
        fleet_number: normalizedFleetNumber,
        garage_id: defaultGarage?.id || null,
        status: 'AVAILABLE',
        mileage: 0,
      })
      .select('*')
      .single()

    if (createError || !newBus) {
      console.error('Error creating bus:', createError)
      // Continue anyway - show form with error state
      // Create a mock bus object so the form can still render
      bus = {
        id: 'temp',
        fleet_number: normalizedFleetNumber,
        garage_id: defaultGarage?.id || null,
        status: 'AVAILABLE',
        mileage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any
    } else {
      bus = newBus
    }
  }

  // Get the garage for the bus
  const busGarage = garages.find(g => g.id === bus.garage_id) || null

  // Transform bus to match expected format
  const transformedBus = {
    id: bus.id,
    fleetNumber: bus.fleet_number,
    garageId: bus.garage_id,
    status: bus.status,
    mileage: bus.mileage,
    createdAt: bus.created_at,
    updatedAt: bus.updated_at,
    garage: busGarage,
  }

  return (
    <div className="min-h-screen bg-background">
      <QuickLogForm bus={transformedBus} garages={garages || []} />
    </div>
  )
}
