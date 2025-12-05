import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check if garages exist
    const { data: garages, error, count } = await supabase
      .from('garages')
      .select('*', { count: 'exact' })
      .order('name')

    if (error) {
      throw error
    }

    // If no garages, create them
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
        message: 'Garages created successfully',
        garages: [northGarage, southGarage],
        created: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Garages already exist',
      garages: garages,
      count: count || garages.length,
      created: false,
    })
  } catch (error) {
    console.error('Failed to verify/create garages:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify/create garages', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

