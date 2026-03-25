import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/twilio/status
 *
 * Twilio Status Callback — called by Twilio when a call's status changes.
 * Used as a fallback to mark calls as completed/failed if the Python agent
 * didn't report back (e.g. agent crashed or wasn't running).
 *
 * Twilio sends: CallSid, CallStatus, CallDuration (on completed)
 * Statuses: initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid      = formData.get('CallSid')      as string | null
  const callStatus   = formData.get('CallStatus')   as string | null
  const callDuration = formData.get('CallDuration') as string | null // seconds, present on "completed"

  if (!callSid || !callStatus) {
    return NextResponse.json({ error: 'Missing CallSid or CallStatus' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Look up the call log by Twilio SID
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('id, status, duration_seconds')
    .eq('twilio_call_sid', callSid)
    .single()

  if (!callLog) {
    // Not an error — call might have been initiated before this feature was added
    return new Response('OK', { status: 200 })
  }

  // Map Twilio status to our internal status
  const statusMap: Record<string, string> = {
    'in-progress': 'in_progress',
    'completed':   'completed',
    'busy':        'failed',
    'failed':      'failed',
    'no-answer':   'failed',
    'canceled':    'failed',
  }

  const newStatus = statusMap[callStatus]
  if (!newStatus) {
    // 'initiated' or 'ringing' — no update needed, we already set those
    return new Response('OK', { status: 200 })
  }

  // Only update if our record is still in an "unfinished" state.
  // If the Python agent already reported completion, don't overwrite it.
  const unfinishedStatuses = ['initiated', 'ringing', 'in_progress']
  if (!unfinishedStatuses.includes(callLog.status)) {
    return new Response('OK', { status: 200 })
  }

  const updates: Record<string, unknown> = { status: newStatus }

  if (callStatus === 'completed') {
    const duration = callDuration ? parseInt(callDuration, 10) : 0
    // Only set duration if we don't already have one from the Python agent
    if (!callLog.duration_seconds || callLog.duration_seconds === 0) {
      updates.duration_seconds = duration
    }
    updates.ended_at = new Date().toISOString()
  } else if (newStatus === 'failed') {
    updates.ended_at = new Date().toISOString()
  }

  await supabase
    .from('call_logs')
    .update(updates)
    .eq('id', callLog.id)

  return new Response('OK', { status: 200 })
}
