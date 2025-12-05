import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { supabase } from '../lib/supabase'

async function main() {
  console.log('Seeding database...')

  // Create garages
  const { data: northGarage, error: northError } = await supabase
    .from('garages')
    .upsert({
      code: 'NORTH',
      name: 'North Garage',
    }, {
      onConflict: 'code',
    })
    .select()
    .single()

  if (northError) {
    console.error('Error creating North Garage:', northError)
  }

  const { data: southGarage, error: southError } = await supabase
    .from('garages')
    .upsert({
      code: 'SOUTH',
      name: 'South Garage',
    }, {
      onConflict: 'code',
    })
    .select()
    .single()

  if (southError) {
    console.error('Error creating South Garage:', southError)
  }

  if (!northGarage || !southGarage) {
    throw new Error('Failed to create garages')
  }

  console.log('Created garages:', { northGarage, southGarage })

  // Check existing buses
  const { data: existingBuses } = await supabase
    .from('buses')
    .select('fleet_number')

  const existingFleetNumbers = new Set(
    existingBuses?.map(b => b.fleet_number.toUpperCase().trim()) || []
  )

  console.log(`Found ${existingFleetNumbers.size} existing buses`)

  // Create 300 buses (175 North, 125 South)
  const buses = []
  for (let i = 1; i <= 300; i++) {
    const garage = i <= 175 ? northGarage : southGarage
    const fleetNumber = `BUS-${i.toString().padStart(3, '0')}`
    
    // Skip if already exists
    if (existingFleetNumbers.has(fleetNumber)) {
      console.log(`Skipping ${fleetNumber} - already exists`)
      continue
    }
    
    const { data: bus, error } = await supabase
      .from('buses')
      .insert({
        fleet_number: fleetNumber,
        garage_id: garage.id,
        status: i % 10 === 0 ? 'IN_MAINTENANCE' : i % 20 === 0 ? 'OUT_OF_SERVICE' : 'AVAILABLE',
        mileage: Math.floor(Math.random() * 200000) + 50000,
      })
      .select()
      .single()

    if (error) {
      console.error(`Error creating bus ${fleetNumber}:`, error)
    } else if (bus) {
      buses.push(bus)
      if (buses.length % 50 === 0) {
        console.log(`Created ${buses.length} buses so far...`)
      }
    }
  }

  console.log(`Created ${buses.length} buses`)

  // Fetch all buses (existing + newly created) for creating maintenance events
  const { data: allBuses } = await supabase
    .from('buses')
    .select('id, garage_id, fleet_number')
    .order('fleet_number')

  if (!allBuses || allBuses.length === 0) {
    console.log('No buses available for creating maintenance events')
    return
  }

  console.log(`Using ${allBuses.length} total buses for maintenance events`)

  // Create some maintenance events
  const mechanics = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'Tom Brown']
  const maintenanceTypes = ['INCIDENT', 'PREVENTIVE', 'REPAIR', 'INSPECTION'] as const
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const
  const statuses = ['NEW', 'IN_PROGRESS', 'COMPLETED'] as const

  for (let i = 0; i < 50; i++) {
    const bus = allBuses[Math.floor(Math.random() * allBuses.length)]
    const garage = bus.garage_id === northGarage.id ? northGarage : southGarage
    const startedAt = new Date()
    startedAt.setDate(startedAt.getDate() - Math.floor(Math.random() * 30))
    
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const completedAt = status === 'COMPLETED' 
      ? new Date(startedAt.getTime() + Math.random() * 48 * 60 * 60 * 1000)
      : null

    await supabase.from('maintenance_events').insert({
      bus_id: bus.id,
      garage_id: garage.id,
      mechanic_name: mechanics[Math.floor(Math.random() * mechanics.length)],
      type: maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: `Maintenance event ${i + 1} for bus ${bus.fleet_number}`,
      parts_used: Math.random() > 0.5 ? `Part-${Math.floor(Math.random() * 100)}` : null,
      started_at: startedAt.toISOString(),
      completed_at: completedAt?.toISOString() || null,
      status,
    })
  }

  console.log('Created maintenance events')

  // Create some incidents
  const reporters = ['Driver A', 'Driver B', 'Mechanic C', 'Supervisor D']
  for (let i = 0; i < 30; i++) {
    const bus = allBuses[Math.floor(Math.random() * allBuses.length)]
    const garage = bus.garage_id === northGarage.id ? northGarage : southGarage
    const reportedAt = new Date()
    reportedAt.setDate(reportedAt.getDate() - Math.floor(Math.random() * 30))

    await supabase.from('incidents').insert({
      bus_id: bus.id,
      garage_id: garage.id,
      reported_by: reporters[Math.floor(Math.random() * reporters.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: `Incident ${i + 1} reported for bus ${bus.fleet_number}`,
      reported_at: reportedAt.toISOString(),
    })
  }

  console.log('Created incidents')

  // Create inventory items
  const parts = [
    { name: 'Brake Pads', partNumber: 'BP-001' },
    { name: 'Oil Filter', partNumber: 'OF-002' },
    { name: 'Air Filter', partNumber: 'AF-003' },
    { name: 'Windshield Wiper', partNumber: 'WW-004' },
    { name: 'Headlight Bulb', partNumber: 'HB-005' },
    { name: 'Tire', partNumber: 'T-006' },
    { name: 'Battery', partNumber: 'BAT-007' },
    { name: 'Alternator', partNumber: 'ALT-008' },
  ]

  for (const part of parts) {
    for (const garage of [northGarage, southGarage]) {
      await supabase.from('inventory_items').insert({
        name: part.name,
        part_number: part.partNumber,
        quantity: Math.floor(Math.random() * 50) + 5,
        reorder_threshold: 10,
        garage_id: garage.id,
      })
    }
  }

  console.log('Created inventory items')
  console.log('Seeding completed!')
  console.log(`Summary: ${buses.length} new buses created, ${existingFleetNumbers.size} already existed, ${allBuses.length} total buses in database`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
