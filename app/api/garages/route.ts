import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: garages, error } = await supabase
      .from('garages')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    // If no garages exist, create default ones
    if (!garages || garages.length === 0) {
      console.log('No garages found, creating default garages...')
      
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

      // Re-fetch garages
      const { data: updatedGarages, error: refetchError } = await supabase
        .from('garages')
        .select('*')
        .order('name')

      if (refetchError) {
        throw refetchError
      }

      return NextResponse.json(updatedGarages || [])
    }

    return NextResponse.json(garages || [])
  } catch (error) {
    console.error('Failed to fetch garages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch garages', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Create default garages
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
      throw new Error(`Failed to create North Garage: ${northError.message}`)
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
      throw new Error(`Failed to create South Garage: ${southError.message}`)
    }

    return NextResponse.json({
      success: true,
      garages: [northGarage, southGarage],
    })
  } catch (error) {
    console.error('Failed to create garages:', error)
    return NextResponse.json(
      { error: 'Failed to create garages', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

