import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

// GET /api/clients — list all clients (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('clients')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/clients — create a new client (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { company_name, industry, notes, credit_balance, credit_threshold, profile_id } = body

  if (!company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      company_name,
      industry: industry ?? null,
      notes: notes ?? null,
      credit_balance: credit_balance ?? 0,
      credit_threshold: credit_threshold ?? 10,
      profile_id: profile_id ?? null,
    } as any)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
