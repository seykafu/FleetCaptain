import { supabase, BusStatus, Severity } from './supabase'

interface PredictionResult {
  targetDate: Date
  availableBusCount: number
  unavailableBusCount: number
  highRiskBusCount: number
  highRiskBuses: Array<{
    busId: string
    fleetNumber: string
    reason: string
  }>
}

interface BusMetrics {
  busId: string
  fleetNumber: string
  status: BusStatus
  maintenanceEventsLast30Days: number
  incidentsLast30Days: number
  openCriticalHighEvents: number
  garageId: string
}

/**
 * Deterministic prediction engine for bus availability
 * Simulates predictions based on historical data and current state
 */
export class PredictionEngine {
  private readonly HIGH_RISK_INCIDENT_THRESHOLD = 3
  private readonly HIGH_RISK_MAINTENANCE_THRESHOLD = 2
  private readonly AVAILABILITY_DROP_THRESHOLD = 5

  /**
   * Calculate average repair duration by garage (in hours)
   */
  private async getAverageRepairDurationByGarage(garageId: string): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: completedEvents, error } = await supabase
      .from('maintenance_events')
      .select('started_at, completed_at')
      .eq('garage_id', garageId)
      .eq('status', 'COMPLETED')
      .not('completed_at', 'is', null)
      .gte('started_at', thirtyDaysAgo.toISOString())

    if (error || !completedEvents || completedEvents.length === 0) {
      // Default to 24 hours if no historical data
      return 24
    }

    const durations = completedEvents
      .map((event) => {
        if (!event.completed_at) return null
        const started = new Date(event.started_at)
        const completed = new Date(event.completed_at)
        const diff = completed.getTime() - started.getTime()
        return diff / (1000 * 60 * 60) // Convert to hours
      })
      .filter((d): d is number => d !== null)

    if (durations.length === 0) {
      return 24
    }

    const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length
    return avgHours
  }

  /**
   * Get metrics for all buses
   */
  private async getBusMetrics(): Promise<BusMetrics[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Get all buses
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select('id, fleet_number, status, garage_id')

    if (busesError || !buses) {
      return []
    }

    // Get maintenance events for last 30 days
    const { data: maintenanceEvents } = await supabase
      .from('maintenance_events')
      .select('id, bus_id, status, severity, started_at')
      .gte('started_at', thirtyDaysAgo.toISOString())

    // Get incidents for last 30 days
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, bus_id, reported_at')
      .gte('reported_at', thirtyDaysAgo.toISOString())

    return buses.map((bus) => {
      const busMaintenanceEvents = maintenanceEvents?.filter(
        (e) => e.bus_id === bus.id
      ) || []
      const busIncidents = incidents?.filter((i) => i.bus_id === bus.id) || []

      const openCriticalHigh = busMaintenanceEvents.filter(
        (event) =>
          event.status !== 'COMPLETED' &&
          (event.severity === 'CRITICAL' || event.severity === 'HIGH')
      ).length

      return {
        busId: bus.id,
        fleetNumber: bus.fleet_number,
        status: bus.status as BusStatus,
        maintenanceEventsLast30Days: busMaintenanceEvents.length,
        incidentsLast30Days: busIncidents.length,
        openCriticalHighEvents: openCriticalHigh,
        garageId: bus.garage_id,
      }
    })
  }

  /**
   * Identify high-risk buses
   */
  private identifyHighRiskBuses(metrics: BusMetrics[]): Array<{
    busId: string
    fleetNumber: string
    reason: string
  }> {
    const highRisk: Array<{ busId: string; fleetNumber: string; reason: string }> = []

    for (const metric of metrics) {
      const reasons: string[] = []

      if (metric.incidentsLast30Days >= this.HIGH_RISK_INCIDENT_THRESHOLD) {
        reasons.push(`${metric.incidentsLast30Days} incidents in last 30 days`)
      }

      if (metric.openCriticalHighEvents >= this.HIGH_RISK_MAINTENANCE_THRESHOLD) {
        reasons.push(`${metric.openCriticalHighEvents} open critical/high maintenance events`)
      }

      if (reasons.length > 0) {
        highRisk.push({
          busId: metric.busId,
          fleetNumber: metric.fleetNumber,
          reason: reasons.join('; '),
        })
      }
    }

    return highRisk
  }

  /**
   * Predict availability for a specific target date
   */
  async predictForDate(targetDate: Date): Promise<PredictionResult> {
    const now = new Date()
    const metrics = await this.getBusMetrics()
    const highRiskBuses = this.identifyHighRiskBuses(metrics)

    let availableCount = 0
    let unavailableCount = 0

    // Group buses by garage to calculate average repair times
    const garageIds = [...new Set(metrics.map((m) => m.garageId))]
    const avgRepairDurations = new Map<string, number>()

    for (const garageId of garageIds) {
      const avgHours = await this.getAverageRepairDurationByGarage(garageId)
      avgRepairDurations.set(garageId, avgHours)
    }

    for (const metric of metrics) {
      if (metric.status === 'OUT_OF_SERVICE') {
        unavailableCount++
        continue
      }

      if (metric.status === 'AVAILABLE') {
        // Check if bus will still be available on target date
        // For simplicity, assume available buses stay available unless they have high risk
        const isHighRisk = highRiskBuses.some((hr) => hr.busId === metric.busId)
        if (isHighRisk) {
          // High risk buses have a chance of becoming unavailable
          // For deterministic logic, mark as unavailable if risk is very high
          if (metric.incidentsLast30Days >= 5 || metric.openCriticalHighEvents >= 3) {
            unavailableCount++
          } else {
            availableCount++
          }
        } else {
          availableCount++
        }
      } else if (metric.status === 'IN_MAINTENANCE') {
        // Check if maintenance will be completed by target date
        const avgHours = avgRepairDurations.get(metric.garageId) || 24
        const hoursUntilTarget = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (hoursUntilTarget >= avgHours) {
          // Maintenance should be complete
          availableCount++
        } else {
          unavailableCount++
        }
      }
    }

    return {
      targetDate,
      availableBusCount: availableCount,
      unavailableBusCount: unavailableCount,
      highRiskBusCount: highRiskBuses.length,
      highRiskBuses,
    }
  }

  /**
   * Generate predictions for the next N days
   */
  async generateForecast(days: number = 7): Promise<PredictionResult[]> {
    const results: PredictionResult[] = []

    for (let i = 1; i <= days; i++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + i)
      targetDate.setHours(0, 0, 0, 0)

      const prediction = await this.predictForDate(targetDate)
      results.push(prediction)
    }

    return results
  }

  /**
   * Check if availability drop is significant enough to trigger alert
   */
  async checkAvailabilityDrop(): Promise<{ shouldAlert: boolean; message?: string }> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Get most recent forecast for tomorrow
    const { data: recentForecasts } = await supabase
      .from('forecast_snapshots')
      .select('*')
      .eq('target_date', tomorrow.toISOString())
      .order('date_generated', { ascending: false })
      .limit(1)

    if (!recentForecasts || recentForecasts.length === 0) {
      return { shouldAlert: false }
    }

    const recentForecast = recentForecasts[0]

    // Get previous forecast for comparison
    const { data: previousForecasts } = await supabase
      .from('forecast_snapshots')
      .select('*')
      .eq('target_date', tomorrow.toISOString())
      .lt('date_generated', recentForecast.date_generated)
      .order('date_generated', { ascending: false })
      .limit(1)

    if (!previousForecasts || previousForecasts.length === 0) {
      return { shouldAlert: false }
    }

    const previousForecast = previousForecasts[0]
    const drop = previousForecast.available_bus_count - recentForecast.available_bus_count

    if (drop >= this.AVAILABILITY_DROP_THRESHOLD) {
      return {
        shouldAlert: true,
        message: `⚠️ Forecast Alert: Available buses for tomorrow dropped by ${drop} (from ${previousForecast.available_bus_count} to ${recentForecast.available_bus_count})`,
      }
    }

    return { shouldAlert: false }
  }
}

export const predictionEngine = new PredictionEngine()
