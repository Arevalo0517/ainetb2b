import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/server'

/**
 * POST /api/voice/phone-numbers/sync
 *
 * Fetches all incoming phone numbers from Twilio and imports any that
 * don't already exist in the database (matched by twilio_sid).
 *
 * Body: { client_id }  — client to assign imported numbers to
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { client_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN

  if (!twilioSid || !twilioAuth) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
  }

  try {
    const twilio = (await import('twilio')).default
    const twilioClient = twilio(twilioSid, twilioAuth)

    // Fetch all incoming numbers from Twilio
    const twilioNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 100 })

    if (twilioNumbers.length === 0) {
      return NextResponse.json({ imported: 0, message: 'No numbers found in Twilio account' })
    }

    const supabase = createAdminClient()

    // Get existing twilio_sids so we don't duplicate
    const { data: existing } = await supabase
      .from('phone_numbers')
      .select('twilio_sid')

    const existingSids = new Set((existing ?? []).map(r => r.twilio_sid))

    const toImport = twilioNumbers.filter(n => !existingSids.has(n.sid))

    if (toImport.length === 0) {
      return NextResponse.json({ imported: 0, message: 'All Twilio numbers are already in the database' })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const webhookUrl = `${appUrl}/api/voice/twilio`

    // Update webhook on Twilio side and insert into DB
    const inserts = await Promise.all(
      toImport.map(async (n) => {
        // Update the webhook URL on Twilio so inbound calls work
        await twilioClient.incomingPhoneNumbers(n.sid).update({
          voiceUrl: webhookUrl,
          voiceMethod: 'POST',
        })

        return {
          client_id,
          project_id: null,
          phone_number: n.phoneNumber,
          twilio_sid: n.sid,
          friendly_name: n.friendlyName,
          country_code: n.phoneNumber.startsWith('+1') ? 'US' : 'US',
          status: 'active' as const,
          sip_domain: process.env.TWILIO_SIP_DOMAIN ?? null,
        }
      })
    )

    const { data: inserted, error } = await supabase
      .from('phone_numbers')
      .insert(inserts)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: inserted?.length ?? 0, numbers: inserted })
  } catch (err) {
    console.error('[phone-numbers/sync] Failed:', err)
    return NextResponse.json({ error: 'Failed to sync numbers from Twilio' }, { status: 500 })
  }
}
