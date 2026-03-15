import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { callProxy } from '@/lib/callProxy'

type Params = { params: Promise<{ projectId: string }> }

interface WhatsAppConfig {
  verify_token:    string
  phone_number_id: string
  whatsapp_token:  string
}

// GET /api/channels/whatsapp/[projectId]
// Meta webhook verification
export async function GET(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token || !challenge) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from('projects')
    .select('channel_config')
    .eq('id', projectId)
    .single()

  const config = project?.channel_config as Partial<WhatsAppConfig> | null

  if (!config?.verify_token || config.verify_token !== token) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

// POST /api/channels/whatsapp/[projectId]
// Receive WhatsApp messages from Meta Cloud API
export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new NextResponse('OK', { status: 200 }) // Always 200 to Meta
  }

  // Extract message from Meta payload
  const entry   = (body.entry as { changes?: { value?: { messages?: { from: string; text?: { body: string }; id: string }[]; metadata?: { phone_number_id: string } } }[] }[])?.[0]
  const change  = entry?.changes?.[0]
  const value   = change?.value
  const msgs    = value?.messages

  // ACK non-message events (delivery receipts, read status, etc.)
  if (!msgs?.length) {
    return new NextResponse('OK', { status: 200 })
  }

  const inbound = msgs[0]
  const from    = inbound.from
  const text    = inbound.text?.body?.trim()

  // Skip non-text messages
  if (!text) {
    return new NextResponse('OK', { status: 200 })
  }

  // Fetch project
  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, ai_model, system_prompt, max_tokens_per_message, channel_config')
    .eq('id', projectId)
    .single()

  if (!project || project.status !== 'active') {
    return new NextResponse('OK', { status: 200 })
  }

  const config = project.channel_config as Partial<WhatsAppConfig> | null

  if (!config?.phone_number_id || !config?.whatsapp_token) {
    console.error(`[whatsapp] Project ${projectId} missing WhatsApp credentials`)
    return new NextResponse('OK', { status: 200 })
  }

  // Call proxy for AI reply
  let reply: string
  try {
    const result = await callProxy(projectId, {
      model:      project.ai_model,
      max_tokens: project.max_tokens_per_message,
      messages: [
        { role: 'system', content: project.system_prompt ?? 'You are a helpful assistant.' },
        { role: 'user',   content: text },
      ],
    })
    reply = result.content
  } catch (err) {
    console.error('[whatsapp] Proxy error:', err)
    return new NextResponse('OK', { status: 200 })
  }

  // Send reply via WhatsApp Cloud API
  try {
    await fetch(
      `https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${config.whatsapp_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   from,
          type: 'text',
          text: { body: reply },
        }),
      }
    )
  } catch (err) {
    console.error('[whatsapp] Failed to send reply:', err)
  }

  return new NextResponse('OK', { status: 200 })
}
