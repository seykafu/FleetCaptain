import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { supabase } from '../lib/supabase'

async function main() {
  console.log('Populating placeholder forecast data...')

  // Start date: December 4, 2025
  const startDate = new Date('2025-12-04')
  startDate.setHours(0, 0, 0, 0)

  console.log(`Generating placeholder forecasts going backwards from ${startDate.toLocaleDateString()}...`)
  
  // Generate forecasts for the past 60 days from start date (going backwards)
  let updated = 0
  const totalBuses = 300 // Total fleet size
  
  for (let i = 0; i < 60; i++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(targetDate.getDate() - i)
    
    // Generate placeholder data with some variation
    // Available buses: 260-280 (most buses available)
    // Unavailable: 20-40 (some in maintenance)
    // High risk: 10-20 (some buses at risk)
    const available = 260 + Math.floor(Math.random() * 21) // 260-280
    const unavailable = totalBuses - available
    const highRisk = 10 + Math.floor(Math.random() * 11) // 10-20
    
    // Create a historical date_generated (simulate it was generated on that target date)
    const dateGenerated = new Date(targetDate)
    dateGenerated.setHours(8, 0, 0, 0) // 8 AM on the target date

    // First, try to find existing forecast for this date
    const { data: existing } = await supabase
      .from('forecast_snapshots')
      .select('id')
      .eq('target_date', targetDate.toISOString())
      .limit(1)

    let error
    if (existing && existing.length > 0) {
      // Update existing
      const { error: updateError } = await supabase
        .from('forecast_snapshots')
        .update({
          date_generated: dateGenerated.toISOString(),
          available_bus_count: available,
          unavailable_bus_count: unavailable,
          high_risk_bus_count: highRisk,
          metadata: {
            generatedBy: 'Placeholder',
            note: 'Placeholder data for historical tracking',
          },
        })
        .eq('target_date', targetDate.toISOString())
      error = updateError
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('forecast_snapshots')
        .insert({
          target_date: targetDate.toISOString(),
          date_generated: dateGenerated.toISOString(),
          available_bus_count: available,
          unavailable_bus_count: unavailable,
          high_risk_bus_count: highRisk,
          metadata: {
            generatedBy: 'Placeholder',
            note: 'Placeholder data for historical tracking',
          },
        })
      error = insertError
    }

    if (error) {
      console.error(`Error upserting forecast for ${targetDate.toLocaleDateString()}:`, error)
    } else {
      updated++
      if (updated % 10 === 0 || i < 5) {
        console.log(`✓ Updated forecast for ${targetDate.toLocaleDateString()}: ${available} available, ${unavailable} unavailable, ${highRisk} high risk`)
      }
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log(`\nPlaceholder forecast population completed!`)
  console.log(`Updated: ${updated} forecasts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

