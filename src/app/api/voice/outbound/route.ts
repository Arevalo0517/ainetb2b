import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

/**
 * POST /api/voice/outbound
 *
 * Initiate an outbound voice call (admin only).
 * Creates a LiveKit room, a call_log, and uses Twilio to dial out.
 *
 * Body: { project_id, to_number, metadata? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { project_id, to_number, metadata = {} } = body

  if (!project_id || !to_number) {
    return NextResponse.json(
      { error: 'project_id and to_number are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Validate project
  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, status, type')
    .eq('id', project_id)
    .single()

  if (!project || project.status !== 'active') {
    return NextResponse.json({ error: 'Project not found or not active' }, { status: 404 })
  }

  // Check it's a voice project
  const voiceTypes = ['voz-basico', 'voz-intermedio', 'voz-avanzado']
  if (!voiceTypes.includes(project.type)) {
    return NextResponse.json({ error: 'Project is not a voice agent' }, { status: 400 })
  }

  // Check client credits
  const { data: client } = await supabase
    .from('clients')
    .select('id, credit_balance, status')
    .eq('id', project.client_id)
    .single()

  if (!client || client.status !== 'active' || client.credit_balance <= 0) {
    return NextResponse.json(
      { error: 'Client inactive or insufficient credits' },
      { status: 402 }
    )
  }

  // Get assigned phone number for this project
  const { data: phoneNumber } = await supabase
    .from('phone_numbers')
    .select('id, phone_number, sip_domain')
    .eq('project_id', project_id)
    .eq('status', 'active')
    .single()

  if (!phoneNumber) {
    return NextResponse.json(
      { error: 'No phone number assigned to this project' },
      { status: 400 }
    )
  }

  // Create call_log
  const { data: callLog, error: callError } = await supabase
    .from('call_logs')
    .insert({
      project_id: project.id,
      client_id: client.id,
      direction: 'outbound',
      status: 'initiated',
      from_number: phoneNumber.phone_number,
      to_number,
      metadata,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (callError || !callLog) {
    return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
  }

  const roomName = `voice-${project.id}-${callLog.id}`

  // Update call_log with room name
  await supabase
    .from('call_logs')
    .update({ livekit_room_name: roomName })
    .eq('id', callLog.id)

  // Create LiveKit room
  const livekitUrl = process.env.LIVEKIT_URL
  const livekitApiKey = process.env.LIVEKIT_API_KEY
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  try {
    const { RoomServiceClient } = await import('livekit-server-sdk')
    const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret)
    await roomService.createRoom({ name: roomName, emptyTimeout: 300 })
  } catch (err) {
    console.error('[voice/outbound] Failed to create LiveKit room:', err)
    return NextResponse.json({ error: 'Failed to create voice room' }, { status: 500 })
  }

  // Initiate Twilio outbound call
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN

  if (!twilioSid || !twilioAuth) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
  }

  try {
    const twilio = (await import('twilio')).default
    const twilioClient = twilio(twilioSid, twilioAuth)

    const sipDomain = phoneNumber.sip_domain ?? process.env.LIVEKIT_SIP_DOMAIN ?? 'livekit.sip.twilio.com'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ''
    const statusCallbackUrl = appUrl ? `${appUrl}/api/voice/twilio/status` : undefined

    const call = await twilioClient.calls.create({
      to: to_number,
      from: phoneNumber.phone_number,
      twiml: `<Response><Connect><Stream url="wss://${sipDomain}"><Parameter name="room" value="${roomName}" /><Parameter name="projectId" value="${project.id}" /><Parameter name="callId" value="${callLog.id}" /></Stream></Connect></Response>`,
      ...(statusCallbackUrl && {
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer', 'canceled'],
      }),
    })

    // Update call_log with Twilio SID
    await supabase
      .from('call_logs')
      .update({ twilio_call_sid: call.sid, status: 'ringing' })
      .eq('id', callLog.id)

    return NextResponse.json({
      call_id: callLog.id,
      room_name: roomName,
      twilio_call_sid: call.sid,
      status: 'ringing',
    }, { status: 201 })
  } catch (err) {
    console.error('[voice/outbound] Twilio call failed:', err)
    await supabase
      .from('call_logs')
      .update({ status: 'failed' })
      .eq('id', callLog.id)

    return NextResponse.json({ error: 'Failed to initiate call' }, { status: 500 })
  }
}
