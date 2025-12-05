import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Twilio Status Callback Webhook
 * 
 * Twilio will POST to this endpoint when SMS message status changes.
 * This allows us to track delivery status (sent, delivered, failed, etc.)
 * 
 * To enable:
 * 1. Set TWILIO_STATUS_CALLBACK_URL in Vercel to: https://your-domain.vercel.app/api/twilio/status-callback
 * 2. Twilio will automatically call this endpoint when message status changes
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Twilio sends form-encoded data
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string
    const to = formData.get('To') as string
    const from = formData.get('From') as string
    const errorCode = formData.get('ErrorCode') as string | null
    const errorMessage = formData.get('ErrorMessage') as string | null

    console.log(`[Twilio Status Callback] Message ${messageSid}: ${messageStatus}`, {
      to,
      from,
      errorCode,
      errorMessage
    })

    // Update notification_logs if we can find the message
    // Note: We'd need to store messageSid when sending to match it up
    // For now, we'll just log it
    
    // If you want to update notification_logs, you'd need to:
    // 1. Store the messageSid when sending SMS
    // 2. Query notification_logs by sent_to and recent timestamp
    // 3. Update the status based on messageStatus
    
    // Example statuses: queued, sending, sent, delivered, undelivered, failed

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Twilio Status Callback] Error:', error)
    // Always return 200 to Twilio to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

