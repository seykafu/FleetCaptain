import twilio from 'twilio'
import { supabase, NotificationType, NotificationStatus } from './supabase'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

// Hard-coded ops manager phone number (in production, this would come from a config or user table)
const OPS_MANAGER_PHONE = process.env.OPS_MANAGER_PHONE || '+1234567890'

let twilioClient: twilio.Twilio | null = null

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken)
}

export async function sendSMS(
  to: string,
  message: string,
  type: NotificationType,
  busId?: string
): Promise<boolean> {
  if (!twilioClient || !fromNumber) {
    console.warn('Twilio not configured, skipping SMS send')
    // Log as failed since we can't actually send
    await supabase.from('notification_logs').insert({
      type,
      bus_id: busId,
      message,
      sent_to: to,
      status: 'FAILED' as NotificationStatus,
    })
    return false
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })

    await supabase.from('notification_logs').insert({
      type,
      bus_id: busId,
      message,
      sent_to: to,
      status: 'SENT' as NotificationStatus,
    })

    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    await supabase.from('notification_logs').insert({
      type,
      bus_id: busId,
      message,
      sent_to: to,
      status: 'FAILED' as NotificationStatus,
    })
    return false
  }
}

export async function notifyIncident(
  busFleetNumber: string,
  severity: string,
  description: string
): Promise<void> {
  const message = `🚨 NEW INCIDENT: Bus ${busFleetNumber}\nSeverity: ${severity}\n${description}`
  await sendSMS(OPS_MANAGER_PHONE, message, 'INCIDENT' as NotificationType)
}

export async function notifyBusInGarage(
  busFleetNumber: string,
  garageName: string
): Promise<void> {
  const message = `🔧 Bus ${busFleetNumber} entered maintenance at ${garageName}`
  await sendSMS(OPS_MANAGER_PHONE, message, 'BUS_IN_GARAGE' as NotificationType)
}

export async function notifyRepairCompleted(
  busFleetNumber: string,
  garageName: string
): Promise<void> {
  const message = `✅ Repair completed: Bus ${busFleetNumber} at ${garageName} - now AVAILABLE`
  await sendSMS(OPS_MANAGER_PHONE, message, 'REPAIR_COMPLETED' as NotificationType)
}

export async function notifyForecastUpdate(
  message: string
): Promise<void> {
  await sendSMS(OPS_MANAGER_PHONE, message, 'FORECAST_UPDATE' as NotificationType)
}

// Notify all followers of a bus about a maintenance update
export async function notifyBusFollowers(
  busId: string,
  busFleetNumber: string,
  updateMessage: string
): Promise<void> {
  try {
    // Get all users following this bus
    const { data: follows, error: followsError } = await supabase
      .from('bus_follows')
      .select('user_id')
      .eq('bus_id', busId)

    if (followsError || !follows || follows.length === 0) {
      return // No followers or error
    }

    // Get user IDs
    const userIds = follows.map((f: any) => f.user_id)

    // Fetch maintenance users with phone numbers
    const { data: users, error: usersError } = await supabase
      .from('maintenance_users')
      .select('id, phone')
      .in('id', userIds)
      .not('phone', 'is', null)

    if (usersError || !users || users.length === 0) {
      return // No users with phone numbers
    }

    // Send SMS to each follower who has a phone number
    const notifications = users.map((user: any) =>
      sendSMS(
        user.phone,
        `🚌 Bus ${busFleetNumber} Update:\n${updateMessage}`,
        'BUS_IN_GARAGE' as NotificationType,
        busId
      )
    )

    await Promise.all(notifications)
  } catch (error) {
    console.error('Failed to notify bus followers:', error)
    // Don't throw - this is a non-critical operation
  }
}

