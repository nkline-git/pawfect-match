import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, APPROVAL_RECIPIENT } from '@/lib/email'
import { lookupEin, einErrorMessage, type EinLookup } from '@/lib/ein'

// POST /api/rescue/request-approval  { ein?: string }
// A draft rescue submits its page for review. An EIN is optional but, when
// given (now or at sign-up), must belong to a 501(c)(3) in IRS records — it
// speeds up the admin's review. Submitting never publishes: only an admin's
// Verify in /admin does (enforced in the DB by migration 015). The rescue can
// keep editing its page and pets while the review is pending.
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let bodyEin: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.ein === 'string' && body.ein.trim()) bodyEin = body.ein.trim()
  } catch { /* no body — submitting without an EIN */ }

  const { data: rescue, error: fetchErr } = await supabase
    .from('rescues')
    .select('id, name, city, email, phone, website, mission, ein, published')
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !rescue) {
    return NextResponse.json({ error: 'No rescue found for this account' }, { status: 404 })
  }
  if (rescue.published) {
    return NextResponse.json({ error: 'This rescue is already published' }, { status: 400 })
  }

  // A newly entered EIN must check out; one saved at sign-up was already
  // checked on /rescue/verify and is looked up again only to show the admin
  // the IRS name (a lookup outage there doesn't block the request).
  let irs: EinLookup | null = null
  let ein: string | null = rescue.ein
  if (bodyEin) {
    irs = await lookupEin(bodyEin)
    if (irs.status !== 'ok') {
      return NextResponse.json(
        { error: einErrorMessage(irs), reason: irs.status },
        { status: irs.status === 'unavailable' ? 503 : 400 },
      )
    }
    const { data: taken } = await supabase
      .from('rescues')
      .select('id, name')
      .eq('ein', irs.ein)
      .neq('id', rescue.id)
      .maybeSingle()
    if (taken) {
      return NextResponse.json(
        { error: `This EIN is already registered to "${taken.name}". Contact support if this is an error.` },
        { status: 409 },
      )
    }
    ein = irs.ein
  } else if (rescue.ein) {
    irs = await lookupEin(rescue.ein)
  }

  const requestedAt = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('rescues')
    .update({ approval_requested_at: requestedAt, ein })
    .eq('id', rescue.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  const { count: petCount } = await supabase
    .from('pets')
    .select('id', { count: 'exact', head: true })
    .eq('rescue_id', rescue.id)

  const esc = (s: string | null | undefined) =>
    (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const irsLine = !ein
    ? 'No EIN provided — manual review'
    : irs?.status === 'ok'
      ? `${irs.name} (${[irs.city, irs.state].filter(Boolean).join(', ') || 'location n/a'}) — 501(c)(3) in IRS records`
      : 'IRS lookup unavailable right now — check manually'

  const email = await sendEmail({
    to: APPROVAL_RECIPIENT,
    subject: `🐾 Rescue ready for review: ${rescue.name}`,
    html: `
      <h2>A rescue submitted their page for review</h2>
      <p>Their page and pets stay hidden from adopters until you click Verify in /admin.
      Confirm the account really represents this organization (e.g. call the number on
      their IRS-registered or public website) before verifying.</p>
      <table cellpadding="4">
        <tr><td><b>Name on page</b></td><td>${esc(rescue.name)}</td></tr>
        <tr><td><b>City</b></td><td>${esc(rescue.city)}</td></tr>
        <tr><td><b>EIN</b></td><td>${esc(ein)}</td></tr>
        <tr><td><b>IRS record</b></td><td>${esc(irsLine)}</td></tr>
        <tr><td><b>Pets added</b></td><td>${petCount ?? 0}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(rescue.email)}</td></tr>
        <tr><td><b>Phone</b></td><td>${esc(rescue.phone)}</td></tr>
        <tr><td><b>Website</b></td><td>${esc(rescue.website)}</td></tr>
        <tr><td><b>Mission</b></td><td>${esc(rescue.mission)}</td></tr>
        <tr><td><b>Account email</b></td><td>${esc(user.email)}</td></tr>
      </table>
      <p>
        Review in the
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pawfect-match-khaki.vercel.app'}/admin">moderation dashboard</a>
        — Verify publishes their page.
      </p>
    `,
  }).catch(() => ({ sent: false, reason: 'send failed' }))

  return NextResponse.json({
    ok: true,
    requestedAt,
    ein,
    emailSent: email.sent,
    // Request is safely queued in /admin even when email isn't configured
    ...(email.sent ? {} : { emailNote: email.reason }),
  })
}
