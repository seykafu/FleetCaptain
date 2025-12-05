import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get current user's followed buses
// For now, we'll use a default user ID or get it from a query param
// In production, this would come from authentication
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id') // In production, get from auth

    if (!userId) {
      // For now, return empty array if no user_id
      // In production, get from authenticated session
      return NextResponse.json([])
    }

    const { data: follows, error } = await supabase
      .from('bus_follows')
      .select(`
        bus_id,
        buses!inner(fleet_number)
      `)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    // Transform to include fleet_number
    const transformed = (follows || []).map((follow: any) => ({
      bus_id: follow.bus_id,
      fleet_number: follow.buses?.fleet_number || 'Unknown',
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to fetch bus follows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch follows', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Follow a bus
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bus_id, user_id } = body

    if (!bus_id) {
      return NextResponse.json(
        { error: 'bus_id is required' },
        { status: 400 }
      )
    }

    // In production, get user_id from authenticated session
    // For now, we'll require it in the body or use a default
    const finalUserId = user_id || body.mechanic_user_id

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('bus_follows')
      .select('id')
      .eq('user_id', finalUserId)
      .eq('bus_id', bus_id)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Already following this bus' })
    }

    const { data: follow, error } = await supabase
      .from('bus_follows')
      .insert({
        user_id: finalUserId,
        bus_id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(follow)
  } catch (error) {
    console.error('Failed to follow bus:', error)
    return NextResponse.json(
      { error: 'Failed to follow bus', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

