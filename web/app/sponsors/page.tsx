'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

// "Become a sponsor" — inquiry form for local pet businesses and brands.
// Deliberately no invented audience numbers or prices: pricing is quoted
// per sponsor, and real numbers come from each sponsor's own report link.

const PACKAGES = [
  {
    value: 'local',
    icon: '📍',
    title: 'Local partner',
    body: 'Your business shown to adopters in your area at the moment they match with a pet — and on pet detail pages. Ideal for vets, groomers, trainers, boarding, and pet-friendly services.',
    status: null as string | null,
  },
  {
    value: 'adoption',
    icon: '🧡',
    title: 'Sponsored adoptions',
    body: 'Cover adoption fees for pets at partner rescues, with your business credited on those pets. Great goodwill — and a new client at the start of a pet’s life with their family.',
    status: 'Coming soon — tell us you’re interested',
  },
  {
    value: 'presenting',
    icon: '⭐',
    title: 'Presenting sponsor',
    body: 'One brand featured across the app as the presenting sponsor. Best for regional or national pet brands.',
    status: null,
  },
] as const

const PROMISES = [
  'Every sponsor is reviewed and approved by hand — pet-related businesses only',
  'Always clearly labeled “Sponsored” — never disguised as a pet listing',
  'Show nationwide, or only to adopters within a set distance of your city',
  'A private report link with your views, clicks, and click rate by day',
  'No personal data about adopters is shared with sponsors',
]

type Form = {
  business_name: string; contact_name: string; email: string; phone: string
  website: string; city: string; package: string; message: string; company_url: string
}
const EMPTY: Form = { business_name: '', contact_name: '', email: '', phone: '', website: '', city: '', package: 'local', message: '', company_url: '' }

export default function SponsorsPage() {
  const [form, setForm]     = useState<Form>(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res  = await fetch('/api/sponsors/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'Something went wrong. Please try again.'); return }
      setSent(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#e05a4e] placeholder:text-gray-400'

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[560px] space-y-3">

        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Back to Pawfect Match"
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-white font-semibold">Sponsor Pawfect Match</span>
        </div>

        <section className="bg-white rounded-2xl shadow-lg px-5 py-5">
          <p className="text-3xl mb-2" aria-hidden="true">🐾</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            Meet new pet families <span style={{ color: '#e05a4e' }}>the day they adopt</span>
          </h1>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Pawfect Match helps people find adoptable pets from real rescues and shelters. When someone
            matches with a pet, they suddenly need a vet, a groomer, a trainer, supplies, and insurance —
            sponsors are there at exactly that moment, in their neighborhood.
          </p>
        </section>

        <section className="space-y-2" aria-label="Sponsorship options">
          {PACKAGES.map(p => (
            <div key={p.value} className="bg-white rounded-2xl shadow-sm px-4 py-3.5 flex gap-3">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{p.icon}</span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">{p.title}</h2>
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{p.body}</p>
                {p.status && <p className="text-[11px] font-semibold text-amber-700 mt-1">{p.status}</p>}
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">What every sponsor gets</h2>
          <ul className="space-y-1.5">
            {PROMISES.map(t => (
              <li key={t} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <Check size={14} className="text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-600 mt-3">
            Pricing is a simple flat monthly rate based on your area and placement — tell us about your
            business and we’ll send options.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm px-5 py-5" aria-labelledby="inquiry-heading">
          {sent ? (
            <div className="text-center py-4" role="status">
              <p className="text-3xl mb-2" aria-hidden="true">🎉</p>
              <h2 className="text-lg font-bold text-gray-900">Thanks — we got it!</h2>
              <p className="text-sm text-gray-600 mt-1">We’ll reply to {form.email} with sponsorship options.</p>
              <Link href="/" className="inline-block mt-4 text-sm font-semibold" style={{ color: '#e05a4e' }}>
                Back to Pawfect Match →
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3" noValidate>
              <h2 id="inquiry-heading" className="text-base font-bold text-gray-900">Become a sponsor</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Business name *</span>
                  <input required value={form.business_name} onChange={set('business_name')} className={input} autoComplete="organization" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Your name *</span>
                  <input required value={form.contact_name} onChange={set('contact_name')} className={input} autoComplete="name" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Email *</span>
                  <input required type="email" value={form.email} onChange={set('email')} className={input} autoComplete="email" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Phone</span>
                  <input type="tel" value={form.phone} onChange={set('phone')} className={input} autoComplete="tel" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">City</span>
                  <input value={form.city} onChange={set('city')} placeholder="San Diego, CA" className={input} autoComplete="address-level2" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">Website</span>
                  <input value={form.website} onChange={set('website')} placeholder="yourbusiness.com" className={input} autoComplete="url" />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Interested in</span>
                <select value={form.package} onChange={set('package')} className={`${input} bg-white`}>
                  {PACKAGES.map(p => <option key={p.value} value={p.value}>{p.title}</option>)}
                  <option value="other">Not sure yet</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Anything else?</span>
                <textarea value={form.message} onChange={set('message')} rows={3} maxLength={2000}
                  placeholder="What you offer new pet owners, the area you serve…" className={`${input} resize-none`} />
              </label>

              {/* Honeypot — hidden from people, catches form-filling bots */}
              <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                <label>Company URL<input tabIndex={-1} autoComplete="off" value={form.company_url} onChange={set('company_url')} /></label>
              </div>

              {error && (
                <p role="alert" className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={sending}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#e05a4e' }}>
                {sending && <Loader2 size={15} className="animate-spin" />}
                {sending ? 'Sending…' : 'Send inquiry'}
              </button>
              <p className="text-[11px] text-gray-500 text-center">We only use these details to reply to you.</p>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
