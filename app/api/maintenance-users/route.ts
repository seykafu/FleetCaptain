import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    let queryBuilder = supabase
      .from('maintenance_users')
      .select('id, name, email, phone')
      .order('name', { ascending: true })

    // If there's a search query, filter by name
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    }

    // Limit results for autocomplete
    queryBuilder = queryBuilder.limit(20)

    const { data: users, error } = await queryBuilder

    if (error) {
      throw error
    }

    return NextResponse.json(users || [])
  } catch (error) {
    console.error('Failed to fetch maintenance users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance users', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('maintenance_users')
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to create maintenance user:', error)
    return NextResponse.json(
      { error: 'Failed to create maintenance user', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

