import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

/**
 * PUT /api/voice/phone-numbers/:id
 *
 * Reassign a phone number to a different project. Admin only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { project_id } = body

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('phone_numbers')
    .update({ project_id: project_id ?? null })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/voice/phone-numbers/:id
 *
 * Release a Twilio phone number. Admin only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Get the phone number to release
  const { data: phoneNumber } = await supabase
    .from('phone_numbers')
    .select('twilio_sid')
    .eq('id', id)
    .single()

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
  }

  // Release from Twilio
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN

  if (twilioSid && twilioAuth) {
    try {
      const twilio = (await import('twilio')).default
      const twilioClient = twilio(twilioSid, twilioAuth)
      await twilioClient.incomingPhoneNumbers(phoneNumber.twilio_sid).remove()
    } catch (err) {
      console.error('[voice/phone-numbers] Twilio release failed:', err)
    }
  }

  // Mark as released in DB
  const { error } = await supabase
    .from('phone_numbers')
    .update({ status: 'released', project_id: null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
