import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { phone } = body

    const { data: user, error } = await supabase
      .from('maintenance_users')
      .update({ phone: phone || null })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to update maintenance user:', error)
    return NextResponse.json(
      { error: 'Failed to update user', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

