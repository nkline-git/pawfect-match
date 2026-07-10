'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { geocodeCity } from '@/lib/geocode'
import { useRescue } from '@/hooks/useRescue'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'

const ANIMAL_TYPES = ['Dogs', 'Cats', 'Rabbits', 'Birds', 'Reptiles', 'Small Animals', 'Farm Animals']

const LOGO_OPTIONS = ['🏠', '🐾', '🐕', '🐱', '🐰', '🦮', '🐕‍🦺', '🏡', '💛', '🌟']

function RescueSetupForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
  const { createRescue } = useRescue()

  // EIN + org name come from the verify step; sessionStorage backs them up
  // across the login/signup round-trip so the agency never re-verifies.
  const [ein,     setEin]     = useState(searchParams.get('ein') ?? '')
  const [orgName, setOrgName] = useState(searchParams.get('orgName') ?? '')

  const [name, setName]           = useState(orgName)
  const [city, setCity]           = useState('')
  const [mission, setMission]     = useState('')
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')
  const [website, setWebsite]     = useState('')
  const [hours, setHours]         = useState('')
  const [feeRange, setFeeRange]   = useState('')
  const [animalTypes, setAnimalTypes] = useState<string[]>([])
  const [logo, setLogo]           = useState('🏠')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    // Restore verify-step data if the URL params were lost across the auth round-trip
    if (!ein) {
      try {
        const stash = JSON.parse(sessionStorage.getItem('pawfect_pending_rescue') ?? 'null')
        if (stash?.ein) {
          setEin(stash.ein)
          setOrgName(stash.orgName ?? '')
          if (!name && stash.orgName) setName(stash.orgName)
        }
      } catch { /* noop */ }
    } else {
      try { sessionStorage.setItem('pawfect_pending_rescue', JSON.stringify({ ein, orgName })) } catch { /* noop */ }
    }

    // Require auth — send agencies back here (with their EIN) after login/signup
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        router.replace(`/login?next=${next}`)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

  const toggleAnimalType = (t: string) =>
    setAnimalTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleSave = async () => {
    if (!name.trim() || !city.trim()) { setError('Name and city are required.'); return }

    setSaving(true)
    setError(null)

    // Geocode the city so this rescue's pets are distance-filtered correctly
    const coords = await geocodeCity(city)

    const { error: err } = await createRescue({
      name: name.trim(),
      city: city.trim(),
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      mission: mission.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      hours: hours.trim() || null,
      fee_range: feeRange.trim() || null,
      animal_types: animalTypes,
      logo,
      banner_gradient: 'linear-gradient(135deg,#1A4A9C,#2D7DD2)',
      appointment_required: false,
      requirements: { application: true, homeVisit: false, refCheck: false, trial: false },
      requirement_notes: null,
      ein,
      verified: false,
      verified_at: null,
      stats: { animals: 0, placed: 0, apps: 0 },
    })

    setSaving(false)
    if (err) { setError(err); return }
    try { sessionStorage.removeItem('pawfect_pending_rescue') } catch { /* noop */ }
    router.replace('/rescue/dashboard')
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-white">Set up your rescue</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Verify EIN', 'Set up profile', 'Go live'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                i < 2 ? 'text-white' : 'bg-gray-100 text-gray-400'
              }`} style={i < 2 ? { backgroundColor: '#e05a4e' } : {}}>
                {i < 1 && <Check size={11} />}
                {step}
              </div>
              {i < 2 && <div className="h-px bg-gray-300" style={{ minWidth: 8 }} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo emoji</label>
            <div className="flex flex-wrap gap-2">
              {LOGO_OPTIONS.map(l => (
                <button
                  key={l}
                  onClick={() => setLogo(l)}
                  className={`w-10 h-10 rounded-full text-xl flex items-center justify-center border-2 transition-all ${
                    logo === l ? 'border-[#e05a4e] bg-red-50 scale-110' : 'border-transparent bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rescue name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="San Diego, CA"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mission <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={mission}
              onChange={e => setMission(e.target.value)}
              placeholder="Saving one paw at a time…"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@rescue.org"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yourrescue.org"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Hours + fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hours</label>
              <input
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="Mon–Sat 10–5"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee range</label>
              <input
                value={feeRange}
                onChange={e => setFeeRange(e.target.value)}
                placeholder="$50–$200"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Animal types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Animals you rescue</label>
            <div className="flex flex-wrap gap-2">
              {ANIMAL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => toggleAnimalType(t)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    animalTypes.includes(t)
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={animalTypes.includes(t) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                >
                  {animalTypes.includes(t) && <Check size={11} />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Create rescue profile →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RescueSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    }>
      <RescueSetupForm />
    </Suspense>
  )
}
