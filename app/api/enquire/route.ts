import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Lazy-initialised so missing env vars don't crash the build
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { place_id, home_name, home_city, name, email, phone, care_type, budget_range, timing, message } = body

    // Basic validation
    if (!place_id || !name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const resend = getResend()

    // Store enquiry in Supabase
    const { error: dbError } = await supabaseAdmin.from('enquiries').insert({
      place_id,
      home_name,
      home_city,
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone?.trim() || null,
      care_type:    care_type || null,
      budget_range: budget_range || null,
      timing:       timing || null,
      message:      message?.trim() || null,
      status:       'new',
    })

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save enquiry.' }, { status: 500 })
    }

    // Send notification email to Careformum
    if (resend) {
      await resend.emails.send({
        from:    'Careformum Enquiries <enquiries@careformum.com>',
        to:      ['kneeraj09@trustestimate-ai.com'],
        replyTo: email.trim(),
        subject: `New Enquiry — ${home_name ?? 'Care Home'} (${home_city ?? ''})`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#be123c;">New Care Home Enquiry</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#78716c;width:140px;">Care Home</td><td style="padding:8px 0;font-weight:600;">${home_name ?? '—'}, ${home_city ?? '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Name</td><td style="padding:8px 0;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Phone</td><td style="padding:8px 0;">${phone || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Care Type</td><td style="padding:8px 0;">${care_type || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Budget / Week</td><td style="padding:8px 0;">${budget_range || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;">Timing</td><td style="padding:8px 0;">${timing || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;vertical-align:top;">Message</td><td style="padding:8px 0;">${message || '—'}</td></tr>
            </table>
            <p style="margin-top:24px;font-size:12px;color:#a8a29e;">
              Reply directly to this email to respond to ${name}.
            </p>
          </div>
        `,
      })

      // Send confirmation email to the user
      await resend.emails.send({
        from:    'Careformum <enquiries@careformum.com>',
        to:      [email.trim()],
        subject: `Your enquiry about ${home_name ?? 'a care home'} — Careformum`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#be123c;">We've received your enquiry</h2>
            <p style="color:#57534e;">Hi ${name},</p>
            <p style="color:#57534e;">
              Thank you for enquiring about <strong>${home_name ?? 'the care home'}</strong>
              ${home_city ? `in ${home_city}` : ''}.
              We'll be in touch within one business day with information on availability and costs.
            </p>
            <p style="color:#57534e;">
              In the meantime, you can browse more care homes at
              <a href="https://www.careformum.com" style="color:#be123c;">careformum.com</a>.
            </p>
            <p style="color:#a8a29e;font-size:12px;margin-top:32px;">
              Careformum · UK Care Home Directory for Elderly Women
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Enquiry route error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
