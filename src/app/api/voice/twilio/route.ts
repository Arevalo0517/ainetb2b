import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/voice/twilio
 *
 * Twilio inbound call webhook. Maps the dialed number to a project,
 * creates a LiveKit room, logs the call, and returns TwiML to connect
 * the caller via SIP to LiveKit.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const toNumber  = formData.get('To')      as string | null
  const fromNumber = formData.get('From')   as string | null
  const callSid   = formData.get('CallSid') as string | null

  if (!toNumber) {
    return xml('<Response><Say>System error.</Say></Response>', 400)
  }

  const supabase = createAdminClient()

  // 1. Map phone number → project
  const { data: phoneNumber, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('id, project_id, client_id')
    .eq('phone_number', toNumber)
    .eq('status', 'active')
    .single()

  if (phoneError || !phoneNumber?.project_id) {
    return xml('<Response><Say>This number is not configured.</Say><Hangup/></Response>')
  }

  // 2. Validate project is active
  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, status')
    .eq('id', phoneNumber.project_id)
    .single()

  if (!project || project.status !== 'active') {
    return xml('<Response><Say>This service is currently unavailable.</Say><Hangup/></Response>')
  }

  // 3. Validate client has credits
  const { data: client } = await supabase
    .from('clients')
    .select('id, credit_balance, status')
    .eq('id', project.client_id)
    .single()

  if (!client || client.status !== 'active' || client.credit_balance <= 0) {
    return xml('<Response><Say>This service is currently unavailable.</Say><Hangup/></Response>')
  }

  // 4. Create call log
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
  // Use short IDs to keep SIP URI username under 40 chars (SIP limit)
  const shortProject = project.id.split('-')[0]  // first 8 hex chars
  const shortCall    = callId.split('-')[0]       // first 8 hex chars
  const roomName = `v-${shortProject}-${shortCall}`

  // Note: room is created automatically by LiveKit Individual Dispatch rule.
  // Store roomName so the agent can look up this call_log via sip.trunkPhoneNumber.
  await supabase
    .from('call_logs')
    .update({ livekit_room_name: roomName })
    .eq('id', callId)

  // 5. Connect caller to LiveKit via SIP
  const sipDomain = process.env.LIVEKIT_SIP_DOMAIN ?? ''

  if (!sipDomain) {
    // Fallback: keep caller connected with silence while agent joins
    // This won't produce audio — SIP domain is required
    console.error('[twilio] LIVEKIT_SIP_DOMAIN not set. Audio will not work.')
    return xml(`<Response><Pause length="60"/></Response>`)
  }

  // TwiML: Dial the LiveKit SIP inbound URI
  // LiveKit SIP inbound format: sip:<roomName>@<sip-domain>
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${encodeURIComponent(roomName)}@${sipDomain}</Sip>
  </Dial>
</Response>`

  return xml(twiml)
}

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  })
}
