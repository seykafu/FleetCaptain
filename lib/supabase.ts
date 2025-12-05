import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for server-side operations (uses service role key if available)
export const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
)

// Client for client-side operations
export const createClientSupabase = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Database types
export type BusStatus = 'AVAILABLE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE'
export type MaintenanceType = 'INCIDENT' | 'PREVENTIVE' | 'REPAIR' | 'INSPECTION'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type MaintenanceStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED'
export type NotificationType = 'INCIDENT' | 'BUS_IN_GARAGE' | 'REPAIR_COMPLETED' | 'FORECAST_UPDATE'
export type NotificationStatus = 'SENT' | 'FAILED'

export interface Database {
  public: {
    Tables: {
      garages: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
          updated_at?: string
        }
      }
      buses: {
        Row: {
          id: string
          fleet_number: string
          garage_id: string
          status: BusStatus
          mileage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fleet_number: string
          garage_id: string
          status?: BusStatus
          mileage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fleet_number?: string
          garage_id?: string
          status?: BusStatus
          mileage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_events: {
        Row: {
          id: string
          bus_id: string
          garage_id: string
          mechanic_name: string
          type: MaintenanceType
          severity: Severity
          description: string
          parts_used: string | null
          started_at: string
          completed_at: string | null
          status: MaintenanceStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bus_id: string
          garage_id: string
          mechanic_name: string
          type: MaintenanceType
          severity: Severity
          description: string
          parts_used?: string | null
          started_at: string
          completed_at?: string | null
          status?: MaintenanceStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bus_id?: string
          garage_id?: string
          mechanic_name?: string
          type?: MaintenanceType
          severity?: Severity
          description?: string
          parts_used?: string | null
          started_at?: string
          completed_at?: string | null
          status?: MaintenanceStatus
          created_at?: string
          updated_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          bus_id: string
          garage_id: string
          reported_by: string
          severity: Severity
          description: string
          reported_at: string
          linked_maintenance_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bus_id: string
          garage_id: string
          reported_by: string
          severity: Severity
          description: string
          reported_at?: string
          linked_maintenance_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bus_id?: string
          garage_id?: string
          reported_by?: string
          severity?: Severity
          description?: string
          reported_at?: string
          linked_maintenance_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          part_number: string
          quantity: number
          reorder_threshold: number
          garage_id: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          part_number: string
          quantity?: number
          reorder_threshold?: number
          garage_id: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          part_number?: string
          quantity?: number
          reorder_threshold?: number
          garage_id?: string
          updated_at?: string
          created_at?: string
        }
      }
      forecast_snapshots: {
        Row: {
          id: string
          date_generated: string
          target_date: string
          available_bus_count: number
          unavailable_bus_count: number
          high_risk_bus_count: number
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          date_generated?: string
          target_date: string
          available_bus_count: number
          unavailable_bus_count: number
          high_risk_bus_count: number
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          date_generated?: string
          target_date?: string
          available_bus_count?: number
          unavailable_bus_count?: number
          high_risk_bus_count?: number
          metadata?: Record<string, any> | null
        }
      }
      notification_logs: {
        Row: {
          id: string
          type: NotificationType
          bus_id: string | null
          message: string
          sent_to: string
          sent_at: string
          status: NotificationStatus
        }
        Insert: {
          id?: string
          type: NotificationType
          bus_id?: string | null
          message: string
          sent_to: string
          sent_at?: string
          status?: NotificationStatus
        }
        Update: {
          id?: string
          type?: NotificationType
          bus_id?: string | null
          message?: string
          sent_to?: string
          sent_at?: string
          status?: NotificationStatus
        }
      }
    }
  }
}

