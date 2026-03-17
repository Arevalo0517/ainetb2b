import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateVoiceCredits } from '@/lib/credits'

/**
 * POST /api/voice/webhook
 *
 * Called by the Python LiveKit agent worker after a voice call ends.
 * Calculates credits, updates call_log, and deducts credits atomically.
 *
 * Auth: x-voice-secret header (shared secret between worker and Next.js)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-voice-secret')
  if (!secret || secret !== process.env.VOICE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    call_id,
    project_id,
    duration_seconds,
    transcript,
    summary,
    recording_url,
    llm_tokens_input = 0,
    llm_tokens_output = 0,
    tts_characters = 0,
    status = 'completed',
    metadata = {},
    analysis_summary,
    analysis_structured_data,
    analysis_success,
  } = body

  if (!call_id || !project_id) {
    return NextResponse.json(
      { error: 'call_id and project_id are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Fetch project and call_log
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('id, client_id, direction')
    .eq('id', call_id)
    .single()

  if (!callLog) {
    return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
  }

  // Fetch voice config for LLM model info
  const { data: voiceConfig } = await supabase
    .from('voice_configs')
    .select('voice_ai_model')
    .eq('project_id', project_id)
    .single()

  const llmModel = voiceConfig?.voice_ai_model ?? 'gpt-4o-mini'

  // Calculate credits
  const { costUsd, creditsConsumed, breakdown } = calculateVoiceCredits(
    duration_seconds ?? 0,
    callLog.direction as 'inbound' | 'outbound',
    llmModel,
    llm_tokens_input,
    llm_tokens_output,
    tts_characters
  )

  // Update call_log
  const { error: updateError } = await supabase
    .from('call_logs')
    .update({
      status,
      duration_seconds: duration_seconds ?? 0,
      credits_used: creditsConsumed,
      cost_breakdown: { ...breakdown, total: costUsd },
      recording_url,
      transcript,
      summary,
      metadata,
      ended_at: new Date().toISOString(),
      ...(analysis_summary !== undefined && { analysis_summary }),
      ...(analysis_structured_data !== undefined && { analysis_structured_data }),
      ...(analysis_success !== undefined && { analysis_success }),
    })
    .eq('id', call_id)

  if (updateError) {
    console.error('[voice/webhook] Failed to update call_log:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Deduct credits atomically
  if (creditsConsumed > 0 && callLog.client_id) {
    const { error: rpcError } = await supabase.rpc('deduct_voice_credits', {
      p_client_id: callLog.client_id,
      p_credits: creditsConsumed,
      p_call_id: call_id,
      p_description: `Voice call — ${callLog.direction}, ${Math.ceil((duration_seconds ?? 0) / 60)} min, project: ${project_id}`,
    })

    if (rpcError) {
      console.error('[voice/webhook] Failed to deduct credits:', rpcError)
    }
  }

  return NextResponse.json({
    ok: true,
    credits_consumed: creditsConsumed,
    cost_usd: costUsd,
    breakdown,
  })
}
