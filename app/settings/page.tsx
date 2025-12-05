import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/Card'
import { BusQRCodeManager } from '@/components/BusQRCodeManager'
import { GarageStatus } from '@/components/GarageStatus'
import { PhoneNumberSettings } from '@/components/PhoneNumberSettings'
import { BusFollowManager } from '@/components/BusFollowManager'
import { supabase } from '@/lib/supabase'

export default async function SettingsPage() {
  let buses: any[] = []

  try {
    // Get buses list
    const { data: busesData, error: busesError } = await supabase
      .from('buses')
      .select('fleet_number')
      .order('fleet_number', { ascending: true })

    if (busesError) {
      console.error('Error fetching buses:', busesError)
    } else {
      buses = busesData || []
      console.log('Settings page - Buses fetched:', buses.length)
    }
  } catch (error) {
    console.error('Error in settings page:', error)
    // Continue with empty data
  }

  // Ensure buses is always an array with the correct structure
  const formattedBuses = buses.map(bus => ({
    fleet_number: bus.fleet_number || bus.fleetNumber || ''
  })).filter(bus => bus.fleet_number)

  return (
    <AppShell pageTitle="Settings">
      <div className="space-y-6">
        {/* Garage Status */}
        <Card 
          title="Database Setup" 
          subtitle="Verify and manage garages in the database"
        >
          <GarageStatus />
        </Card>

        {/* Phone Number Settings */}
        <PhoneNumberSettings />

        {/* Bus Follow Manager */}
        <BusFollowManager />

        {/* QR Code Generation */}
        <Card 
          title="Generate Bus QR Codes" 
          subtitle="Generate QR codes for buses to enable quick mobile logging"
        >
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> The dev server has been configured to accept network connections. 
              Make sure to restart your dev server with <code className="bg-yellow-100 px-1 rounded">npm run dev</code> 
              if you haven't already.
            </p>
          </div>
          <BusQRCodeManager buses={formattedBuses} />
        </Card>
      </div>
    </AppShell>
  )
}
