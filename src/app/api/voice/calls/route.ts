import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server'

/**
 * GET /api/voice/calls
 *
 * List call logs. Admins see all, clients see their own.
 * Query params: client_id, project_id, direction, limit, offset
 */
export async function GET(req: NextRequest) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const projectId = searchParams.get('project_id')
  const direction = searchParams.get('direction')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  let targetClientId = clientId

  if (profile.role !== 'admin') {
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient) {
      return NextResponse.json({ error: 'Client not found for this profile' }, { status: 404 })
    }

    if (clientId && clientId !== myClient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    targetClientId = myClient.id
  }

  let query = supabase
    .from('call_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (targetClientId) {
    query = query.eq('client_id', targetClientId)
  }
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  if (direction) {
    query = query.eq('direction', direction)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
