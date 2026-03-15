import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/twilio
 *
 * Twilio inbound call webhook. Maps the dialed phone number to a project,
 * creates a call_log, and returns TwiML to connect the caller to a
 * LiveKit room via SIP.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const toNumber = formData.get('To') as string | null
  const fromNumber = formData.get('From') as string | null
  const callSid = formData.get('CallSid') as string | null

  if (!toNumber) {
    return new Response('<Response><Say>System error.</Say></Response>', {
      status: 400,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const supabase = createAdminClient()

  // Look up the phone number → project
  const { data: phoneNumber, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('id, project_id, client_id, sip_domain')
    .eq('phone_number', toNumber)
    .eq('status', 'active')
    .single()

  if (phoneError || !phoneNumber || !phoneNumber.project_id) {
    return new Response(
      '<Response><Say>This number is not configured.</Say><Hangup/></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  }

  // Validate project is active
  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, status')
    .eq('id', phoneNumber.project_id)
    .single()

  if (!project || project.status !== 'active') {
    return new Response(
      '<Response><Say>This service is currently unavailable.</Say><Hangup/></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  }

  // Validate client has credits
  const { data: client } = await supabase
    .from('clients')
    .select('id, credit_balance, status')
    .eq('id', project.client_id)
    .single()

  if (!client || client.status !== 'active' || client.credit_balance <= 0) {
    return new Response(
      '<Response><Say>This service is currently unavailable.</Say><Hangup/></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  }

  // Create call_log
  const { data: callLog } = await supabase
    .from('call_logs')
    .insert({
      project_id: project.id,
      client_id: client.id,
      direction: 'inbound',
      status: 'ringing',
      from_number: fromNumber,
      to_number: toNumber,
      twilio_call_sid: callSid,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const callId = callLog?.id ?? crypto.randomUUID()
  const roomName = `voice-${project.id}-${callId}`

  // Build SIP URI for LiveKit
  const sipDomain = phoneNumber.sip_domain ?? process.env.LIVEKIT_SIP_DOMAIN ?? 'livekit.sip.twilio.com'

  // Update call_log with room name
  await supabase
    .from('call_logs')
    .update({ livekit_room_name: roomName })
    .eq('id', callId)

  // Return TwiML to connect via SIP to LiveKit
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${sipDomain}">
      <Parameter name="room" value="${roomName}" />
      <Parameter name="projectId" value="${project.id}" />
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
</Response>`

  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
