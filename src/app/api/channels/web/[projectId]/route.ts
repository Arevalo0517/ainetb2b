import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { callProxy } from '@/lib/callProxy'

type Params = { params: Promise<{ projectId: string }> }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS — preflight for cross-origin web widgets
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// POST /api/channels/web/[projectId]
// Body: { message: string, history?: [{role, content}] }
// Returns: { reply: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params

  let body: { message?: string; history?: { role: string; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const { message, history = [] } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400, headers: CORS })
  }

  // Fetch project for system_prompt and model config
  const supabase = createAdminClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, status, ai_model, system_prompt, max_tokens_per_message, channel_config')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS })
  }

  if (project.status !== 'active') {
    return NextResponse.json({ error: 'Agent is not active' }, { status: 403, headers: CORS })
  }

  // Check allowed origin if configured
  const config = (project.channel_config ?? {}) as Record<string, string>
  if (config.allowed_origin) {
    const origin = req.headers.get('origin') ?? ''
    if (origin && !origin.startsWith(config.allowed_origin)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: CORS })
    }
  }

  // Build messages (cap history at last 10 turns = 20 messages)
  const recentHistory = history.slice(-20).filter(m =>
    m.role === 'user' || m.role === 'assistant'
  ) as { role: 'user' | 'assistant'; content: string }[]

  const messages = [
    { role: 'system' as const, content: project.system_prompt ?? 'You are a helpful assistant.' },
    ...recentHistory,
    { role: 'user' as const, content: message.trim() },
  ]

  try {
    const result = await callProxy(projectId, {
      model:      project.ai_model,
      max_tokens: project.max_tokens_per_message,
      messages,
    })
    return NextResponse.json({ reply: result.content }, { headers: CORS })
  } catch (err: unknown) {
    const e = err as { status?: number; data?: { error?: string } }
    const status = e.status ?? 500
    const message = e.data?.error ?? 'Internal error'
    return NextResponse.json({ error: message }, { status, headers: CORS })
  }
}
