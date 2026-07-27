import { NextResponse } from 'next/server'
import { sendEmail, APPROVAL_RECIPIENT } from '@/lib/email'

// TEMPORARY diagnostic route — verifies RESEND_API_KEY is wired up on Vercel.
// Remove after confirming delivery (see git history for removal commit).
export async function GET() {
  const result = await sendEmail({
    to: APPROVAL_RECIPIENT,
    subject: '🐾 Pawfect Match — Resend test email',
    html: '<p>This confirms RESEND_API_KEY is configured correctly on Vercel. Safe to ignore/delete.</p>',
  })
  return NextResponse.json(result)
}
