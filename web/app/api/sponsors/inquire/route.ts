import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, APPROVAL_RECIPIENT } from '@/lib/email'

// POST /api/sponsors/inquire — "Become a sponsor" form. Stores the inquiry
// (sponsor_inquiries, migration 016; visible in /admin → Ads) and emails the
// site owner. Either one succeeding counts: before the migration is applied
// the email alone still delivers the lead.

const PACKAGES = ['local', 'adoption', 'presenting', 'other'] as const
const LIMITS = { business_name: 200, contact_name: 200, email: 320, phone: 50, website: 500, city: 200, message: 2000 }

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  // Honeypot: real people never see or fill this field
  if (typeof body.company_url === 'string' && body.company_url.trim()) {
    return NextResponse.json({ ok: true })
  }

  const str = (k: keyof typeof LIMITS) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '')
  const fields = {
    business_name: str('business_name'),
    contact_name:  str('contact_name'),
    email:         str('email'),
    phone:         str('phone') || null,
    website:       str('website') || null,
    city:          str('city') || null,
    message:       str('message') || null,
    package:       PACKAGES.includes(body.package as (typeof PACKAGES)[number]) ? (body.package as string) : 'other',
  }

  if (!fields.business_name || !fields.contact_name) {
    return NextResponse.json({ error: 'Please add your business name and your name.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = fields[k as keyof typeof fields]
    if (typeof v === 'string' && v.length > max) {
      return NextResponse.json({ error: 'One of the fields is too long.' }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const { error: insertError } = await supabase.from('sponsor_inquiries').insert(fields)
  if (insertError) console.error('sponsor inquiry insert failed:', insertError.message)

  const esc = (s: string | null) => (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const email = await sendEmail({
    to: APPROVAL_RECIPIENT,
    subject: `💼 New sponsor inquiry: ${fields.business_name}`,
    html: `
      <h2>New sponsor inquiry</h2>
      <table cellpadding="4">
        <tr><td><b>Business</b></td><td>${esc(fields.business_name)}</td></tr>
        <tr><td><b>Contact</b></td><td>${esc(fields.contact_name)}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(fields.email)}</td></tr>
        <tr><td><b>Phone</b></td><td>${esc(fields.phone)}</td></tr>
        <tr><td><b>Website</b></td><td>${esc(fields.website)}</td></tr>
        <tr><td><b>City</b></td><td>${esc(fields.city)}</td></tr>
        <tr><td><b>Interested in</b></td><td>${esc(fields.package)}</td></tr>
        <tr><td><b>Message</b></td><td>${esc(fields.message)}</td></tr>
      </table>
      <p>Reply directly to ${esc(fields.email)}. Inquiries are also listed in /admin → Ads.</p>
    `,
  }).catch(() => ({ sent: false }))

  if (insertError && !email.sent) {
    return NextResponse.json(
      { error: "We couldn't send your inquiry right now. Please try again in a few minutes." },
      { status: 503 },
    )
  }
  return NextResponse.json({ ok: true })
}
