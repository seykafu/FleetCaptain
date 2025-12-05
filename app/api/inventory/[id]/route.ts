import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, reorderThreshold } = body

    const updateData: any = {}
    if (quantity !== undefined) updateData.quantity = parseInt(quantity)
    if (reorderThreshold !== undefined) updateData.reorder_threshold = parseInt(reorderThreshold)

    const { data: updated, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Transform to match expected format
    const transformed = updated ? {
      id: updated.id,
      name: updated.name,
      partNumber: updated.part_number,
      quantity: updated.quantity,
      reorderThreshold: updated.reorder_threshold,
      garageId: updated.garage_id,
      updatedAt: updated.updated_at,
      createdAt: updated.created_at,
    } : null

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}
