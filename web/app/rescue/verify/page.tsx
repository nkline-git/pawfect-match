'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

export default function RescueVerifyPage() {
  const router = useRouter()

  const [ein, setEin]         = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const formatEin = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9)
    if (digits.length > 2) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return digits
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const digits = ein.replace(/\D/g, '')
    if (digits.length !== 9) { setError('Please enter a valid 9-digit EIN (XX-XXXXXXX).'); return }
    if (!orgName.trim())     { setError('Please enter your organization name.'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/rescue/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ein, orgName: orgName.trim() }),
      })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? 'Verification failed.'); return }

      router.push(
        `/rescue/setup?ein=${encodeURIComponent(ein)}&orgName=${encodeURIComponent(orgName.trim())}`
      )
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft size={18} />
          </a>
          <h1 className="text-lg font-bold text-white">Rescue / Shelter Portal</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
              <Building2 size={22} style={{ color: '#e05a4e' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Verify your nonprofit</h2>
              <p className="text-xs text-gray-500">We use your EIN to confirm 501(c)(3) status</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-6">
            {['Verify EIN', 'Set up profile', 'Go live'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  i === 0
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-400'
                }`} style={i === 0 ? { backgroundColor: '#e05a4e' } : {}}>
                  {i === 0 && <CheckCircle size={11} />}
                  {step}
                </div>
                {i < 2 && <div className="flex-1 h-px bg-gray-200" style={{ minWidth: 8 }} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organization name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Happy Paws Rescue"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                EIN (Employer Identification Number)
              </label>
              <input
                type="text"
                value={ein}
                onChange={e => setEin(formatEin(e.target.value))}
                placeholder="XX-XXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 font-mono tracking-widest"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Found on your IRS determination letter or Form 990
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#e05a4e' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify & continue →'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Your EIN is used only for verification and is never shared publicly.
          </p>
        </div>
      </div>
    </div>
  )
}
