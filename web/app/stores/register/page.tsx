'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/hooks/useStore'
import { Loader2, Check, ArrowLeft } from 'lucide-react'

const LOGO_OPTIONS = ['🏪', '🐾', '🐕', '🐱', '🦮', '🐟', '🐦', '🌿', '🦴', '🛁', '🌟', '💛']

const COVER_GRADIENTS = [
  { label: 'Ocean',   value: 'linear-gradient(135deg,#1A4A9C,#2D7DD2)' },
  { label: 'Coral',   value: 'linear-gradient(135deg,#e05a4e,#c44b40)' },
  { label: 'Forest',  value: 'linear-gradient(135deg,#059669,#10b981)' },
  { label: 'Purple',  value: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { label: 'Sunset',  value: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { label: 'Slate',   value: 'linear-gradient(135deg,#374151,#6b7280)' },
]

const SPECIALTY_OPTIONS = [
  'Organic food', 'Raw food', 'Grooming', 'Training',
  'Boarding', 'Doggy daycare', 'Aquatics', 'Reptiles',
  'Birds', 'Farm animals', 'Holistic care', 'Adoption support',
]

export default function StoreRegisterPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { createStore } = useStore()

  const [authed,   setAuthed]   = useState<boolean | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Form fields
  const [logo,         setLogo]         = useState('🏪')
  const [cover,        setCover]        = useState(COVER_GRADIENTS[0].value)
  const [name,         setName]         = useState('')
  const [city,         setCity]         = useState('')
  const [address,      setAddress]      = useState('')
  const [phone,        setPhone]        = useState('')
  const [email,        setEmail]        = useState('')
  const [website,      setWebsite]      = useState('')
  const [description,  setDescription]  = useState('')
  const [hours,        setHours]        = useState('')
  const [instagram,    setInstagram]    = useState('')
  const [facebook,     setFacebook]     = useState('')
  const [specialties,  setSpecialties]  = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login?next=%2Fstores%2Fregister')
      else setAuthed(true)
    })
  }, [supabase, router])

  const toggleSpecialty = (s: string) =>
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    if (!name.trim() || !city.trim()) { setError('Store name and city are required.'); return }
    setSaving(true)
    setError(null)

    const { error: err } = await createStore({
      name: name.trim(),
      city: city.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      logo,
      cover_color: cover,
      specialties,
      hours: hours.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      verified: false,
    })

    setSaving(false)
    if (err) { setError(err); return }
    router.replace('/stores/dashboard')
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
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
          <h1 className="text-lg font-bold text-white">List your pet store</h1>
        </div>

        {/* Preview banner */}
        <div className="rounded-2xl overflow-hidden mb-5 shadow-lg" style={{ background: cover }}>
          <div className="h-20" />
          <div className="bg-white px-4 pb-4 pt-0">
            <div className="flex items-end gap-3 -mt-7 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl border-2 border-white">
                {logo}
              </div>
              <div className="pb-1">
                <p className="font-bold text-gray-900 text-sm">{name || 'Your Store Name'}</p>
                <p className="text-xs text-gray-500">{city || 'City, ST'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">

          {/* Cover gradient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover color</label>
            <div className="flex gap-2">
              {COVER_GRADIENTS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setCover(g.value)}
                  className={`w-9 h-9 rounded-xl transition-all ${
                    cover === g.value ? 'ring-2 ring-offset-1 ring-[#e05a4e] scale-110' : ''
                  }`}
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
            </div>
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Paws & Claws Pet Shop"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
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

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Phone + Email */}
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
                placeholder="hello@store.com"
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
              placeholder="https://yourstore.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hours</label>
            <input
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="Mon–Sat 10am–6pm, Sun 11am–5pm"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">About your store <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell pet owners what makes your store special…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    specialties.includes(s)
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={specialties.includes(s) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                >
                  {specialties.includes(s) && <Check size={11} />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
              <input
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="@yourstore"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook</label>
              <input
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                placeholder="yourstore"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
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
            Create store page →
          </button>
        </div>
        <p className="text-center text-xs text-white/50 mt-3 mb-8">
          Your page will be visible in the Pawfect Match shop section
        </p>
      </div>
    </div>
  )
}
