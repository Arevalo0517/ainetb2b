import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin, getCurrentUser } from '@/lib/supabase/server'

/**
 * GET /api/voice/config/:projectId
 *
 * Get voice configuration for a project.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const supabase = createAdminClient()

  // Verify access
  if (profile.role !== 'admin') {
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single()

    if (!project || project.client_id !== myClient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('voice_configs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Voice config not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/voice/config/:projectId
 *
 * Update voice configuration for a project. Admin only.
 * Also creates the config if it doesn't exist yet.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const body = await req.json()

  const supabase = createAdminClient()

  // Check if config already exists
  const { data: existing } = await supabase
    .from('voice_configs')
    .select('id')
    .eq('project_id', projectId)
    .single()

  const allowedFields = [
    'voice_provider', 'stt_model', 'stt_language',
    'tts_model', 'tts_language',
    'voice_system_prompt', 'voice_ai_model', 'voice_max_tokens',
    'n8n_voice_webhook_url', 'n8n_voice_workflow_id', 'voice_tools',
    'greeting_message', 'end_call_phrases', 'max_call_duration_seconds',
    'silence_timeout_seconds', 'transfer_number', 'livekit_room_prefix',
  ]

  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updateData[key] = body[key]
    }
  }

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('voice_configs')
      .update(updateData)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } else {
    // Create new
    const { data, error } = await supabase
      .from('voice_configs')
      .insert({ project_id: projectId, ...updateData })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
}
