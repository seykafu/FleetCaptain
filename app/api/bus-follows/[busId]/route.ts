import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Unfollow a bus
export async function DELETE(
  request: NextRequest,
  { params }: { params: { busId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id') // In production, get from auth

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('bus_follows')
      .delete()
      .eq('user_id', userId)
      .eq('bus_id', params.busId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unfollow bus:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow bus', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

