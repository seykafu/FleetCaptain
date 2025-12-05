import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: buses, error } = await supabase
      .from('buses')
      .select('id, fleet_number')
      .order('fleet_number', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(buses || [])
  } catch (error) {
    console.error('Failed to fetch buses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buses', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fleetNumber, garageId, mileage, status } = body

    if (!fleetNumber || !garageId) {
      return NextResponse.json(
        { error: 'Fleet number and garage ID are required' },
        { status: 400 }
      )
    }

    // Check if bus already exists
    const { data: existing } = await supabase
      .from('buses')
      .select('id')
      .ilike('fleet_number', fleetNumber.toUpperCase().trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Bus with this fleet number already exists' },
        { status: 409 }
      )
    }

    // Create new bus
    const { data: bus, error } = await supabase
      .from('buses')
      .insert({
        fleet_number: fleetNumber.toUpperCase().trim(),
        garage_id: garageId,
        status: status || 'AVAILABLE',
        mileage: mileage || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(bus)
  } catch (error) {
    console.error('Failed to create bus:', error)
    return NextResponse.json(
      { error: 'Failed to create bus', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

