import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server'

/**
 * GET /api/voice/calls/:id
 *
 * Get a single call log with full transcript.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: callLog, error } = await supabase
    .from('call_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !callLog) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  // Non-admin can only see their own calls
  if (profile.role !== 'admin') {
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient || callLog.client_id !== myClient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json(callLog)
}
