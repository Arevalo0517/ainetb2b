import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin, getCurrentUser } from '@/lib/supabase/server'

// GET /api/credits?client_id=xxx — list transactions for a client
export async function GET(req: NextRequest) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const limit    = parseInt(searchParams.get('limit') ?? '50', 10)

  // Admins can query any client; clients can only see their own
  let targetClientId = clientId

  if (profile.role !== 'admin') {
    // Resolve the client linked to this profile
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient) {
      return NextResponse.json({ error: 'Client not found for this profile' }, { status: 404 })
    }

    // Enforce own data only
    if (clientId && clientId !== myClient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    targetClientId = myClient.id
  }

  if (!targetClientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('client_id', targetClientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/credits — manually add credits to a client (admin only)
export async function POST(req: NextRequest) {
  let adminProfile
  try {
    adminProfile = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { client_id, amount, description, type = 'purchase' } = body

  if (!client_id || amount === undefined) {
    return NextResponse.json(
      { error: 'client_id and amount are required' },
      { status: 400 }
    )
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json(
      { error: 'amount must be a positive number' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Get current balance
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, credit_balance')
    .eq('id', client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const newBalance = parseFloat((client.credit_balance + amount).toFixed(2))

  // Update balance
  const { error: updateError } = await supabase
    .from('clients')
    .update({ credit_balance: newBalance })
    .eq('id', client_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log transaction
  const { data: transaction, error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      client_id,
      type,
      amount,
      balance_after: newBalance,
      description: description ?? `Credit ${type} by admin`,
      created_by: adminProfile.id,
    })
    .select()
    .single()

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  return NextResponse.json({
    transaction,
    new_balance: newBalance,
  }, { status: 201 })
}
