import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Handles OAuth, magic link, and password-reset redirects from Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For password-reset flow, skip profile check and go straight to next
      if (next === '/update-password') {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // New users (no profile yet) → send to profile setup
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          // New user: preference quiz first, then profile setup
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
