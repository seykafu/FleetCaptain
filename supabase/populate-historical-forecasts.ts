import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { supabase } from '../lib/supabase'
import { predictionEngine } from '../lib/predictionEngine'

async function main() {
  console.log('Populating historical forecast data...')

  // Start date: December 4, 2025 - always use this as the starting point
  const startDate = new Date('2025-12-04')
  startDate.setHours(0, 0, 0, 0)

  console.log(`Generating forecasts going backwards from ${startDate.toLocaleDateString()}...`)
  
  // Generate forecasts for the past 60 days from start date (going backwards)
  let created = 0
  let skipped = 0
  
  for (let i = 0; i < 60; i++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(targetDate.getDate() - i)
    
    // Check if forecast already exists
    const { data: existing } = await supabase
      .from('forecast_snapshots')
      .select('id')
      .eq('target_date', targetDate.toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      if (i % 10 === 0) {
        console.log(`Skipping ${targetDate.toLocaleDateString()} - already exists (${skipped} skipped so far)`)
      }
      continue
    }

    // Generate prediction for this date
    try {
      const prediction = await predictionEngine.predictForDate(targetDate)
      
      // Create a historical date_generated (simulate it was generated on that target date)
      const dateGenerated = new Date(targetDate)
      dateGenerated.setHours(8, 0, 0, 0) // 8 AM on the target date

      const { error } = await supabase
        .from('forecast_snapshots')
        .insert({
          target_date: targetDate.toISOString(),
          date_generated: dateGenerated.toISOString(),
          available_bus_count: prediction.availableBusCount,
          unavailable_bus_count: prediction.unavailableBusCount,
          high_risk_bus_count: prediction.highRiskBusCount,
          metadata: {
            highRiskBuses: prediction.highRiskBuses,
            generatedBy: 'Historical',
            note: 'Populated for historical tracking',
          },
        })

      if (error) {
        console.error(`Error inserting forecast for ${targetDate.toLocaleDateString()}:`, error)
      } else {
        created++
        if (created % 10 === 0 || i < 5) {
          console.log(`✓ Created forecast for ${targetDate.toLocaleDateString()}: ${prediction.availableBusCount} available, ${prediction.unavailableBusCount} unavailable`)
        }
      }
    } catch (error) {
      console.error(`Error generating prediction for ${targetDate.toLocaleDateString()}:`, error)
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log(`\nHistorical forecast population completed!`)
  console.log(`Created: ${created} forecasts`)
  console.log(`Skipped: ${skipped} (already existed)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

