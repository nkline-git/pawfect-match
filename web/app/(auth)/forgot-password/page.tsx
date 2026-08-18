'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      })
      if (error) { setError(error.message); return }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[390px]">
      <div className="bg-white rounded-2xl shadow-lg px-8 py-10">

        <a href="/login" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={14} />
          Back to sign in
        </a>

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-3">📧</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a password reset link to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🔑</div>
              <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#e05a4e' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send reset link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
