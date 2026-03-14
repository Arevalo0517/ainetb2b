import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

// GET /api/projects — list all projects (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const status   = searchParams.get('status')

  let query = supabase
    .from('projects')
    .select('*, clients(company_name)')
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/projects — create a new project (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    client_id, name, description, type, price,
    n8n_workflow_id, n8n_webhook_url,
    ai_model, system_prompt, max_tokens_per_message,
    channel, channel_config,
  } = body

  if (!client_id || !name || !type) {
    return NextResponse.json(
      { error: 'client_id, name, and type are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id,
      name,
      description: description ?? null,
      type,
      price: price ?? null,
      n8n_workflow_id: n8n_workflow_id ?? null,
      n8n_webhook_url: n8n_webhook_url ?? null,
      ai_model: ai_model ?? 'gpt-4o-mini',
      system_prompt: system_prompt ?? null,
      max_tokens_per_message: max_tokens_per_message ?? 1000,
      channel: channel ?? null,
      channel_config: channel_config ?? {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
