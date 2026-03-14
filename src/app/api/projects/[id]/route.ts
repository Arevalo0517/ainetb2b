import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(company_name, credit_balance)')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT /api/projects/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  const allowedFields = [
    'name', 'description', 'type', 'status', 'price',
    'n8n_workflow_id', 'n8n_webhook_url',
    'ai_model', 'system_prompt', 'max_tokens_per_message',
    'channel', 'channel_config',
  ]
  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key]
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
