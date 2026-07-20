import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, APPROVAL_RECIPIENT } from '@/lib/email'

// POST /api/rescue/request-approval
// A draft rescue (no EIN) asks for manual review. Marks the request on the
// rescue row (surfaces in /admin) and emails the site admin. Approval itself
// happens in /admin — Verify sets verified + published.
export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: rescue, error: fetchErr } = await supabase
    .from('rescues')
    .select('id, name, city, email, phone, website, mission, ein, published, approval_requested_at')
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !rescue) {
    return NextResponse.json({ error: 'No rescue found for this account' }, { status: 404 })
  }
  if (rescue.published) {
    return NextResponse.json({ error: 'This rescue is already published' }, { status: 400 })
  }

  // Record the request (RLS: owner can update own rescue row)
  const requestedAt = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('rescues')
    .update({ approval_requested_at: requestedAt })
    .eq('id', rescue.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  const esc = (s: string | null) =>
    (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const email = await sendEmail({
    to: APPROVAL_RECIPIENT,
    subject: `🐾 Rescue approval request: ${rescue.name}`,
    html: `
      <h2>Manual approval requested</h2>
      <p>A rescue built their page without an EIN and is asking to publish.</p>
      <table cellpadding="4">
        <tr><td><b>Name</b></td><td>${esc(rescue.name)}</td></tr>
        <tr><td><b>City</b></td><td>${esc(rescue.city)}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(rescue.email)}</td></tr>
        <tr><td><b>Phone</b></td><td>${esc(rescue.phone)}</td></tr>
        <tr><td><b>Website</b></td><td>${esc(rescue.website)}</td></tr>
        <tr><td><b>Mission</b></td><td>${esc(rescue.mission)}</td></tr>
        <tr><td><b>Account email</b></td><td>${esc(user.email ?? null)}</td></tr>
      </table>
      <p>
        Review and approve in the
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pawfect-match-khaki.vercel.app'}/admin">moderation dashboard</a>
        — Verify publishes their page.
      </p>
    `,
  })

  return NextResponse.json({
    ok: true,
    requestedAt,
    emailSent: email.sent,
    // Request is safely queued in /admin even when email isn't configured
    ...(email.sent ? {} : { emailNote: email.reason }),
  })
}
