import twilio from 'twilio'
import { supabase, NotificationType, NotificationStatus } from './supabase'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

// Hard-coded ops manager phone number (in production, this would come from a config or user table)
const OPS_MANAGER_PHONE = process.env.OPS_MANAGER_PHONE || '+1234567890'

// Log Twilio configuration on module load (without sensitive data)
if (typeof process !== 'undefined') {
  console.log('[Twilio Config] FROM Number:', fromNumber ? `${fromNumber.substring(0, 4)}...` : 'NOT SET')
  console.log('[Twilio Config] Account SID:', accountSid ? 'SET' : 'NOT SET')
  console.log('[Twilio Config] Auth Token:', authToken ? 'SET' : 'NOT SET')
}

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
    // Validate phone numbers
    if (!fromNumber) {
      console.error('[sendSMS] TWILIO_FROM_NUMBER is not set in environment variables')
      throw new Error('TWILIO_FROM_NUMBER environment variable is required')
    }

    if (!to || to.trim() === '' || to === '+1234567890') {
      console.error('[sendSMS] Invalid recipient phone number:', to)
      throw new Error('Invalid recipient phone number')
    }

    // Explicitly log what we're sending to Twilio
    console.log(`[sendSMS] Preparing to send SMS:`)
    console.log(`[sendSMS]   FROM (TWILIO_FROM_NUMBER): ${fromNumber}`)
    console.log(`[sendSMS]   TO (recipient): ${to}`)
    console.log(`[sendSMS]   Message length: ${message.length} characters`)

    // Optional: Add status callback URL to track delivery status
    // This requires a webhook endpoint at /api/twilio/status-callback
    const statusCallbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL
    
    // Create message with explicit FROM and TO to ensure they're not swapped
    const messageParams = {
      body: message,
      from: fromNumber,  // This MUST be your Twilio phone number
      to: to,            // This MUST be the recipient's phone number
      ...(statusCallbackUrl && { statusCallback: statusCallbackUrl }),
    }
    
    console.log(`[sendSMS] Twilio API call params:`, {
      from: messageParams.from,
      to: messageParams.to,
      bodyLength: messageParams.body.length,
      hasStatusCallback: !!messageParams.statusCallback
    })
    
    const result = await twilioClient.messages.create(messageParams)

    console.log(`[sendSMS] SMS sent successfully. Message SID: ${result.sid}`)
    console.log(`[sendSMS] Twilio response - From: ${result.from}, To: ${result.to}, Status: ${result.status}`)

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
    console.log(`[notifyBusFollowers] Starting notification for bus ${busFleetNumber} (${busId})`)
    
    // Get all users following this bus
    const { data: follows, error: followsError } = await supabase
      .from('bus_follows')
      .select('user_id')
      .eq('bus_id', busId)

    if (followsError) {
      console.error('[notifyBusFollowers] Error fetching follows:', followsError)
      return
    }

    if (!follows || follows.length === 0) {
      console.log(`[notifyBusFollowers] No followers found for bus ${busFleetNumber}`)
      return
    }

    console.log(`[notifyBusFollowers] Found ${follows.length} follower(s)`)

    // Get user IDs
    const userIds = follows.map((f: any) => f.user_id)
    console.log(`[notifyBusFollowers] User IDs:`, userIds)

    // Fetch maintenance users with phone numbers (check for both null and empty string)
    const { data: users, error: usersError } = await supabase
      .from('maintenance_users')
      .select('id, name, phone')
      .in('id', userIds)

    if (usersError) {
      console.error('[notifyBusFollowers] Error fetching users:', usersError)
      return
    }

    if (!users || users.length === 0) {
      console.log(`[notifyBusFollowers] No users found for IDs:`, userIds)
      return
    }

    // Filter to only users with valid phone numbers (not null and not empty)
    const usersWithPhones = users.filter((user: any) => user.phone && user.phone.trim() !== '')
    
    if (usersWithPhones.length === 0) {
      console.log(`[notifyBusFollowers] No users with phone numbers found. Users:`, users.map((u: any) => ({ id: u.id, name: u.name, hasPhone: !!u.phone })))
      return
    }

    console.log(`[notifyBusFollowers] Sending SMS to ${usersWithPhones.length} user(s):`, usersWithPhones.map((u: any) => ({ name: u.name, phone: u.phone })))

    // Send SMS to each follower who has a phone number
    const notifications = usersWithPhones.map((user: any) => {
      // Validate phone number before sending
      if (!user.phone || user.phone.trim() === '' || user.phone === '+1234567890') {
        console.warn(`[notifyBusFollowers] Skipping invalid phone number for user ${user.name}: ${user.phone}`)
        return Promise.resolve(false)
      }
      
      console.log(`[notifyBusFollowers] Sending SMS to ${user.name} at ${user.phone}`)
      return sendSMS(
        user.phone,
        `🚌 Bus ${busFleetNumber} Update:\n${updateMessage}`,
        'BUS_IN_GARAGE' as NotificationType,
        busId
      )
    })

    const results = await Promise.all(notifications)
    const successCount = results.filter(r => r === true).length
    console.log(`[notifyBusFollowers] Sent ${successCount}/${notifications.length} SMS notifications successfully`)
  } catch (error) {
    console.error('[notifyBusFollowers] Failed to notify bus followers:', error)
    // Don't throw - this is a non-critical operation
  }
}

