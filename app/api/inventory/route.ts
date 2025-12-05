import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch items and garages separately for reliability
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('updated_at', { ascending: false })

    if (itemsError) {
      throw itemsError
    }

    // Fetch garages separately
    const { data: garages, error: garagesError } = await supabase
      .from('garages')
      .select('id, name, code')

    if (garagesError) {
      console.error('Error fetching garages:', garagesError)
    }

    // Create garage map
    const garageMap = new Map((garages || []).map(g => [g.id, g]))

    // Transform to match expected format
    const transformed = items?.map((item: any) => ({
      id: item.id,
      name: item.name,
      partNumber: item.part_number,
      quantity: item.quantity,
      reorderThreshold: item.reorder_threshold,
      garageId: item.garage_id,
      updatedAt: item.updated_at,
      createdAt: item.created_at,
      garage: garageMap.get(item.garage_id) || null,
    })) || []

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}
