'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  /* ── helpers ── */
  const clearMessages = () => { setError(null); setSuccess(null) }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        const next = new URLSearchParams(window.location.search).get('next') ?? '/'
        router.push(next)
        router.refresh()
      } else {
        const next = new URLSearchParams(window.location.search).get('next')
        const cb   = `${window.location.origin}/api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: cb },
        })
        if (error) { setError(error.message); return }
        setSuccess('Check your email for a confirmation link!')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearMessages()
    setGoogleLoading(true)
    const next = new URLSearchParams(window.location.search).get('next')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // on success the browser navigates away — no need to stop loading
  }

  const toggleMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    clearMessages()
    setEmail('')
    setPassword('')
  }

  return (
    <div className="w-full max-w-[390px]">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg px-8 py-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐾</div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: '#e05a4e' }}>Pawfect</span>
            <span className="text-gray-900"> Match</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin text-gray-400" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {mode === 'login' && (
              <div className="text-right mt-1">
                <a href="/forgot-password" className="text-xs hover:underline" style={{ color: '#e05a4e' }}>
                  Forgot password?
                </a>
              </div>
            )}
          </div>

          {/* Error / success */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={toggleMode}
            className="font-semibold hover:underline"
            style={{ color: '#e05a4e' }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Business sign-up section */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center mb-3">Are you a business?</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Rescue / shelter */}
            <a
              href="/rescue/verify"
              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-[#e05a4e] hover:bg-red-50 transition-all group text-center"
            >
              <span className="text-xl">🐾</span>
              <p className="text-xs font-semibold text-gray-700 group-hover:text-[#e05a4e] transition-colors leading-tight">
                Rescue or shelter
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">Set up your portal →</p>
            </a>

            {/* Local pet shop */}
            <Link
              href="/stores/register"
              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-[#e05a4e] hover:bg-red-50 transition-all group text-center"
            >
              <span className="text-xl">🏪</span>
              <p className="text-xs font-semibold text-gray-700 group-hover:text-[#e05a4e] transition-colors leading-tight">
                Local pet shop
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">Sign up free →</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Back to browse */}
      <p className="text-center text-sm text-white/80 mt-4">
        <Link href="/" className="hover:text-white transition-colors">
          ← Browse pets without signing in
        </Link>
      </p>

      {/* Legal links */}
      <p className="text-center text-xs text-white/40 mt-3">
        <a href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</a>
        <span className="mx-2">·</span>
        <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</a>
      </p>
    </div>
  )
}
