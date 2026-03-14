import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateCredits } from '@/lib/credits'

/**
 * POST /api/proxy/openai
 *
 * The most critical endpoint in the system.
 * Intercepts n8n → OpenAI calls, validates credits,
 * forwards the request, and logs token usage.
 *
 * Required header: x-project-key: <project_id>
 */
export async function POST(req: NextRequest) {
  // 1. Read project key from header
  const projectId = req.headers.get('x-project-key')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing x-project-key header' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()

  // 2. Verify project exists and is active
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, client_id, status, ai_model, max_tokens_per_message')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  if (project.status !== 'active') {
    return NextResponse.json(
      { error: `Project is not active (status: ${project.status})` },
      { status: 403 }
    )
  }

  // 3. Check client credit balance
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, credit_balance, status')
    .eq('id', project.client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json(
      { error: 'Client not found' },
      { status: 404 }
    )
  }

  if (client.status !== 'active') {
    return NextResponse.json(
      { error: 'Client account is suspended' },
      { status: 403 }
    )
  }

  if (client.credit_balance <= 0) {
    return NextResponse.json(
      { error: 'Insufficient credits. Please recharge your account.' },
      { status: 402 }
    )
  }

  // 4. Parse and forward body to OpenAI
  let requestBody: Record<string, unknown>
  try {
    requestBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }

  let openaiResponse: Response
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach OpenAI', detail: String(err) },
      { status: 502 }
    )
  }

  // 5. Parse OpenAI response
  const openaiData = await openaiResponse.json()

  if (!openaiResponse.ok) {
    return NextResponse.json(openaiData, { status: openaiResponse.status })
  }

  // 6. Calculate credits consumed
  const usage = openaiData.usage ?? {}
  const tokensInput  = usage.prompt_tokens     ?? 0
  const tokensOutput = usage.completion_tokens ?? 0
  const model        = (requestBody.model as string) ?? project.ai_model ?? 'gpt-4o-mini'

  const { costUsd, creditsConsumed } = calculateCredits(model, tokensInput, tokensOutput)

  // 7. Insert api_usage log
  const { data: usageRow, error: usageError } = await supabase
    .from('api_usage')
    .insert({
      project_id: project.id,
      client_id: client.id,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
      credits_consumed: creditsConsumed,
      endpoint: '/api/proxy/openai',
      metadata: { openai_id: openaiData.id },
    })
    .select('id')
    .single()

  if (usageError) {
    console.error('[proxy/openai] Failed to log usage:', usageError)
  }

  // 8. Deduct credits atomically via RPC
  if (creditsConsumed > 0 && usageRow?.id) {
    const { error: rpcError } = await supabase.rpc('deduct_credits', {
      p_client_id:   client.id,
      p_credits:     creditsConsumed,
      p_usage_id:    usageRow.id,
      p_description: `API call — model: ${model}, project: ${project.id}`,
    })

    if (rpcError) {
      console.error('[proxy/openai] Failed to deduct credits:', rpcError)
    }
  }

  // 9. Return OpenAI response verbatim to n8n
  return NextResponse.json(openaiData, { status: 200 })
}
