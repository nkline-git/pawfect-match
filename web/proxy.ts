import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED  = ['/profile', '/rescue/dashboard', '/rescue/setup', '/onboarding', '/admin']
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Refresh the session — required for Server Components to read auth state
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected pages.
  // Keep the full path + query in `next` (e.g. /rescue/setup?ein=…) so
  // flows like rescue verification survive the login round-trip.
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const url  = request.nextUrl.clone()
    const dest = path + url.search
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', dest)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages — honoring `next` if present
  if (user && AUTH_PAGES.some(p => path === p)) {
    const next = request.nextUrl.searchParams.get('next')
    const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
