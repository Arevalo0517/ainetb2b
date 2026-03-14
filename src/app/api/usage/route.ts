import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server'

/**
 * GET /api/usage
 *
 * Returns API usage logs for dashboard charts.
 * Supports grouping by day or month.
 *
 * Query params:
 *   client_id  — filter by client (required for non-admins)
 *   project_id — filter by project (optional)
 *   group_by   — 'day' | 'month' (default: 'day')
 *   from       — ISO date string (default: 30 days ago)
 *   to         — ISO date string (default: now)
 */
export async function GET(req: NextRequest) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)

  const clientId  = searchParams.get('client_id')
  const projectId = searchParams.get('project_id')
  const groupBy   = searchParams.get('group_by') ?? 'day'
  const from      = searchParams.get('from') ?? getDefaultFrom()
  const to        = searchParams.get('to')   ?? new Date().toISOString()

  // Resolve target client
  let targetClientId = clientId

  if (profile.role !== 'admin') {
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (clientId && clientId !== myClient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    targetClientId = myClient.id
  }

  // Fetch raw usage rows
  let query = supabase
    .from('api_usage')
    .select('id, model, tokens_input, tokens_output, cost_usd, credits_consumed, created_at')
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true })

  if (targetClientId) query = query.eq('client_id', targetClientId)
  if (projectId)      query = query.eq('project_id', projectId)

  const { data: rows, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group data client-side
  const grouped = groupUsage(rows ?? [], groupBy as 'day' | 'month')

  // Totals
  const totals = (rows ?? []).reduce(
    (acc, row) => ({
      tokens_input:      acc.tokens_input      + (row.tokens_input ?? 0),
      tokens_output:     acc.tokens_output     + (row.tokens_output ?? 0),
      cost_usd:          acc.cost_usd          + (row.cost_usd ?? 0),
      credits_consumed:  acc.credits_consumed  + (row.credits_consumed ?? 0),
      calls:             acc.calls             + 1,
    }),
    { tokens_input: 0, tokens_output: 0, cost_usd: 0, credits_consumed: 0, calls: 0 }
  )

  return NextResponse.json({ grouped, totals })
}

// ─── Helpers ────────────────────────────────────────────────

function getDefaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

type UsageRow = {
  id: string
  model: string
  tokens_input: number
  tokens_output: number
  cost_usd: number | null
  credits_consumed: number | null
  created_at: string
}

function groupUsage(rows: UsageRow[], groupBy: 'day' | 'month') {
  const map = new Map<string, {
    period: string
    calls: number
    tokens_input: number
    tokens_output: number
    cost_usd: number
    credits_consumed: number
  }>()

  for (const row of rows) {
    const date = new Date(row.created_at)
    const period = groupBy === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : date.toISOString().split('T')[0]

    const existing = map.get(period) ?? {
      period,
      calls: 0,
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      credits_consumed: 0,
    }

    map.set(period, {
      ...existing,
      calls:             existing.calls             + 1,
      tokens_input:      existing.tokens_input      + (row.tokens_input ?? 0),
      tokens_output:     existing.tokens_output     + (row.tokens_output ?? 0),
      cost_usd:          existing.cost_usd          + (row.cost_usd ?? 0),
      credits_consumed:  existing.credits_consumed  + (row.credits_consumed ?? 0),
    })
  }

  return Array.from(map.values())
}
