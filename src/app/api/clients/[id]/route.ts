import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/clients/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*, profiles(email, full_name), projects(*)')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT /api/clients/[id]
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
    'company_name', 'industry', 'status',
    'credit_threshold', 'notes', 'profile_id',
  ]
  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key]
  }

  const { data, error } = await supabase
    .from('clients')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/clients/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
