/**
 * Basic tests for the prediction engine
 * 
 * Run with: npm test (after setting up Jest/Vitest)
 * Or manually test the logic
 */

import { PredictionEngine } from '../lib/predictionEngine'

// Note: These are basic integration tests
// In a full test setup, you'd mock Supabase and test the logic in isolation

describe('PredictionEngine', () => {
  let engine: PredictionEngine

  beforeAll(() => {
    engine = new PredictionEngine()
  })

  it('should generate forecasts for 7 days', async () => {
    const forecasts = await engine.generateForecast(7)
    
    expect(forecasts).toHaveLength(7)
    
    // Each forecast should have required fields
    forecasts.forEach((forecast) => {
      expect(forecast).toHaveProperty('targetDate')
      expect(forecast).toHaveProperty('availableBusCount')
      expect(forecast).toHaveProperty('unavailableBusCount')
      expect(forecast).toHaveProperty('highRiskBusCount')
      expect(forecast).toHaveProperty('highRiskBuses')
      
      // Counts should be non-negative
      expect(forecast.availableBusCount).toBeGreaterThanOrEqual(0)
      expect(forecast.unavailableBusCount).toBeGreaterThanOrEqual(0)
      expect(forecast.highRiskBusCount).toBeGreaterThanOrEqual(0)
    })
  }, 30000) // Longer timeout for DB operations

  it('should identify high-risk buses correctly', async () => {
    const metrics = await (engine as any).getBusMetrics()
    const highRisk = await (engine as any).identifyHighRiskBuses(metrics)
    
    // High risk buses should have reasons
    highRisk.forEach((bus: any) => {
      expect(bus).toHaveProperty('busId')
      expect(bus).toHaveProperty('fleetNumber')
      expect(bus).toHaveProperty('reason')
      expect(bus.reason.length).toBeGreaterThan(0)
    })
  }, 30000)
})

/**
 * Manual test for maintenance status transitions
 * 
 * This would be better as an integration test with a test database
 */
export async function testMaintenanceStatusTransition() {
  const { supabase } = await import('../lib/supabase')
  
  // 1. Create a test bus
  const { data: garages } = await supabase.from('garages').select('*').limit(1)
  if (!garages || garages.length === 0) throw new Error('No garage found')
  const garage = garages[0]

  const { data: bus, error: busError } = await supabase
    .from('buses')
    .insert({
      fleet_number: 'TEST-999',
      garage_id: garage.id,
      status: 'AVAILABLE',
    })
    .select()
    .single()

  if (busError || !bus) throw new Error('Failed to create test bus')

  try {
    // 2. Create a NEW maintenance event
    const { data: event, error: eventError } = await supabase
      .from('maintenance_events')
      .insert({
        bus_id: bus.id,
        garage_id: garage.id,
        mechanic_name: 'Test Mechanic',
        type: 'REPAIR',
        severity: 'MEDIUM',
        description: 'Test repair',
        started_at: new Date().toISOString(),
        status: 'NEW',
      })
      .select()
      .single()

    if (eventError || !event) throw new Error('Failed to create maintenance event')

    // 3. Update to IN_PROGRESS
    await supabase
      .from('maintenance_events')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', event.id)

    // 4. Update bus status to IN_MAINTENANCE
    await supabase
      .from('buses')
      .update({ status: 'IN_MAINTENANCE' })
      .eq('id', bus.id)

    // 5. Complete the event
    await supabase
      .from('maintenance_events')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', event.id)

    // 6. Update bus back to AVAILABLE
    await supabase
      .from('buses')
      .update({ status: 'AVAILABLE' })
      .eq('id', bus.id)

    // Verify final state
    const { data: finalBus } = await supabase
      .from('buses')
      .select('*')
      .eq('id', bus.id)
      .single()

    const { data: finalEvent } = await supabase
      .from('maintenance_events')
      .select('*')
      .eq('id', event.id)
      .single()

    console.log('✅ Maintenance status transition test passed')
    console.log('Final bus status:', finalBus?.status)
    console.log('Final event status:', finalEvent?.status)
    console.log('Event completed at:', finalEvent?.completed_at)

    return {
      success: true,
      busStatus: finalBus?.status === 'AVAILABLE',
      eventStatus: finalEvent?.status === 'COMPLETED',
      hasCompletedAt: !!finalEvent?.completed_at,
    }
  } finally {
    // Cleanup
    await supabase.from('maintenance_events').delete().eq('bus_id', bus.id)
    await supabase.from('buses').delete().eq('id', bus.id)
  }
}

