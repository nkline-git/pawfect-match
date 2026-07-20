// Minimal email sender via Resend (https://resend.com — free tier).
// Set RESEND_API_KEY in the environment; without it, sending is a no-op
// (callers should still persist state so nothing is lost).
// APPROVAL_EMAIL overrides the admin notification recipient.

export const APPROVAL_RECIPIENT =
  process.env.APPROVAL_EMAIL ?? 'nick.kline0@gmail.com'

export async function sendEmail({
  to, subject, html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not configured' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // resend.dev sender works out of the box (no domain setup) but can
        // only deliver to the Resend account owner's address — fine for
        // admin notifications; switch to a verified domain for user email
        from: 'Pawfect Match <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('Resend send failed:', res.status, body)
      return { sent: false, reason: `Resend HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    console.error('Resend send error:', err)
    return { sent: false, reason: String(err) }
  }
}
