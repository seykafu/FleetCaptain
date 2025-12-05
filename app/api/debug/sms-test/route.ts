import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notifyBusFollowers } from '@/lib/twilio'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fleetNumber = searchParams.get('fleetNumber') || 'Bus-002'

    // Find the bus
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id, fleet_number')
      .eq('fleet_number', fleetNumber)
      .single()

    if (busError || !bus) {
      return NextResponse.json({
        error: 'Bus not found',
        fleetNumber,
        busError: busError?.message
      }, { status: 404 })
    }

    // Get all followers
    const { data: follows, error: followsError } = await supabase
      .from('bus_follows')
      .select('user_id')
      .eq('bus_id', bus.id)

    // Get user details
    const userIds = follows?.map((f: any) => f.user_id) || []
    const { data: users } = await supabase
      .from('maintenance_users')
      .select('id, name, phone')
      .in('id', userIds)

    const usersWithPhones = users?.filter((u: any) => u.phone && u.phone.trim() !== '') || []

    // Test notification
    const testMessage = `🧪 Test notification for ${bus.fleet_number}`
    await notifyBusFollowers(bus.id, bus.fleet_number, testMessage)

    return NextResponse.json({
      success: true,
      bus: {
        id: bus.id,
        fleet_number: bus.fleet_number
      },
      follows: {
        count: follows?.length || 0,
        user_ids: userIds,
        error: followsError?.message
      },
      users: {
        total: users?.length || 0,
        with_phones: usersWithPhones.length,
        details: usersWithPhones.map((u: any) => ({
          id: u.id,
          name: u.name,
          phone: u.phone ? `${u.phone.substring(0, 4)}...` : 'none'
        }))
      },
      notification_sent: true
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test SMS',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

