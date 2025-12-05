import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('Starting database seed...')

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
      return NextResponse.json(
        { error: 'Failed to create North Garage', details: northError.message },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: 'Failed to create South Garage', details: southError.message },
        { status: 500 }
      )
    }

    if (!northGarage || !southGarage) {
      return NextResponse.json(
        { error: 'Failed to create garages' },
        { status: 500 }
      )
    }

    console.log('Created garages:', { northGarage, southGarage })

    // Get all existing buses to check
    const { data: existingBuses, error: existingError } = await supabase
      .from('buses')
      .select('fleet_number')

    if (existingError) {
      console.error('Error checking existing buses:', existingError)
    }

    const existingFleetNumbers = new Set(
      existingBuses?.map(b => b.fleet_number.toUpperCase().trim()) || []
    )

    console.log(`Found ${existingFleetNumbers.size} existing buses`)

    // Create 300 buses (175 North, 125 South) in batches for better performance
    const buses = []
    const errors: string[] = []
    const skipped: string[] = []
    
    // Prepare all bus data
    const busesToCreate = []
    for (let i = 1; i <= 300; i++) {
      const garage = i <= 175 ? northGarage : southGarage
      const fleetNumber = `BUS-${i.toString().padStart(3, '0')}`
      
      // Skip if already exists
      if (existingFleetNumbers.has(fleetNumber)) {
        skipped.push(fleetNumber)
        continue
      }
      
      busesToCreate.push({
        fleet_number: fleetNumber,
        garage_id: garage.id,
        status: i % 10 === 0 ? 'IN_MAINTENANCE' : i % 20 === 0 ? 'OUT_OF_SERVICE' : 'AVAILABLE',
        mileage: Math.floor(Math.random() * 200000) + 50000,
      })
    }

    console.log(`Attempting to create ${busesToCreate.length} buses (${skipped.length} skipped)`)

    // Insert buses in batches of 50
    const batchSize = 50
    for (let i = 0; i < busesToCreate.length; i += batchSize) {
      const batch = busesToCreate.slice(i, i + batchSize)
      
      const { data: insertedBuses, error: batchError } = await supabase
        .from('buses')
        .insert(batch)
        .select()

      if (batchError) {
        console.error(`Error creating batch ${i / batchSize + 1}:`, batchError)
        errors.push(`Batch ${i / batchSize + 1}: ${batchError.message}`)
      } else if (insertedBuses) {
        buses.push(...insertedBuses)
        console.log(`Created batch ${i / batchSize + 1}: ${insertedBuses.length} buses`)
      }
    }

    console.log(`Created ${buses.length} new buses`)

    return NextResponse.json({
      success: true,
      message: `Seeded database: ${buses.length} new buses created${skipped.length > 0 ? `, ${skipped.length} already existed` : ''}`,
      garages: {
        north: northGarage,
        south: southGarage,
      },
      busesCreated: buses.length,
      busesSkipped: skipped.length,
      busesExisting: existingFleetNumbers.size,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    })
  } catch (error) {
    console.error('Failed to seed database:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed database', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
