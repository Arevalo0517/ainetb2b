import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireAdmin, getCurrentUser } from '@/lib/supabase/server'

/**
 * GET /api/voice/phone-numbers?client_id=xxx
 *
 * List phone numbers. Admins see all, clients see their own.
 */
export async function GET(req: NextRequest) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('phone_numbers')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile.role !== 'admin') {
    const { data: myClient } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!myClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    query = query.eq('client_id', myClient.id)
  } else if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/voice/phone-numbers
 *
 * Purchase a Twilio phone number and assign it to a client/project.
 * Admin only.
 *
 * Body: { client_id, project_id?, country_code?, area_code? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { client_id, project_id, country_code = 'US', area_code } = body

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

    // Search for available numbers
    const searchParams: Record<string, unknown> = { limit: 1 }
    if (area_code) searchParams.areaCode = area_code

    const availableNumbers = await twilioClient
      .availablePhoneNumbers(country_code)
      .local.list(searchParams)

    if (availableNumbers.length === 0) {
      return NextResponse.json({ error: 'No numbers available in that area' }, { status: 404 })
    }

    // Purchase the number
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const purchased = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      voiceUrl: `${appUrl}/api/voice/twilio`,
      voiceMethod: 'POST',
    })

    // Store in database
    const supabase = createAdminClient()
    const { data: phoneNumber, error } = await supabase
      .from('phone_numbers')
      .insert({
        client_id,
        project_id: project_id ?? null,
        phone_number: purchased.phoneNumber,
        twilio_sid: purchased.sid,
        friendly_name: purchased.friendlyName,
        country_code,
        status: 'active',
        sip_domain: process.env.TWILIO_SIP_DOMAIN ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(phoneNumber, { status: 201 })
  } catch (err) {
    console.error('[voice/phone-numbers] Purchase failed:', err)
    return NextResponse.json({ error: 'Failed to purchase number' }, { status: 500 })
  }
}
