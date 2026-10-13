import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { lookupEin, einErrorMessage } from '@/lib/ein'
import { sendEmail, APPROVAL_RECIPIENT } from '@/lib/email'

// POST /api/rescue/publish  { ein }
// A draft rescue publishes its page by adding an EIN. The EIN must belong to
// a 501(c)(3) in IRS records. Publishing does NOT make the rescue
// "Verified" — that badge is admin-only — so the site owner is notified to
// review it, and it shows in /admin as a pending review.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let ein: unknown
  try { ({ ein } = await request.json()) } catch { /* fall through */ }
  if (typeof ein !== 'string') return NextResponse.json({ error: 'EIN is required' }, { status: 400 })

  const { data: rescue } = await supabase
    .from('rescues')
    .select('id, name, city, email, phone, website')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rescue) return NextResponse.json({ error: 'No rescue found for this account' }, { status: 404 })

  const result = await lookupEin(ein)
  if (result.status !== 'ok') {
    return NextResponse.json(
      { error: einErrorMessage(result), reason: result.status },
      { status: result.status === 'unavailable' ? 503 : 400 },
    )
  }

  const { data: taken } = await supabase
    .from('rescues')
    .select('id, name')
    .eq('ein', result.ein)
    .neq('id', rescue.id)
    .maybeSingle()
  if (taken) {
    return NextResponse.json(
      { error: `This EIN is already registered to "${taken.name}". Contact support if this is an error.` },
      { status: 409 },
    )
  }

  const requestedAt = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('rescues')
    .update({ ein: result.ein, published: true, approval_requested_at: requestedAt })
    .eq('id', rescue.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const esc = (s: string | null) => (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  await sendEmail({
    to: APPROVAL_RECIPIENT,
    subject: `🐾 Rescue published with EIN — please verify: ${rescue.name}`,
    html: `
      <h2>New rescue published</h2>
      <p>The EIN matched a 501(c)(3) in IRS records. Confirm the account really represents this organization, then click Verify in /admin.</p>
      <table cellpadding="4">
        <tr><td><b>Name on page</b></td><td>${esc(rescue.name)}</td></tr>
        <tr><td><b>IRS name</b></td><td>${esc(result.name)}</td></tr>
        <tr><td><b>IRS location</b></td><td>${esc([result.city, result.state].filter(Boolean).join(', '))}</td></tr>
        <tr><td><b>EIN</b></td><td>${esc(result.ein)}</td></tr>
        <tr><td><b>Page city</b></td><td>${esc(rescue.city)}</td></tr>
        <tr><td><b>Contact</b></td><td>${esc(rescue.email)} · ${esc(rescue.phone)} · ${esc(rescue.website)}</td></tr>
        <tr><td><b>Account email</b></td><td>${esc(user.email ?? null)}</td></tr>
      </table>
    `,
  }).catch(() => ({ sent: false }))

  return NextResponse.json({ ok: true, rescue: updated, irsName: result.name })
}
