'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/hooks/useStore'
import { Loader2, Check, LogOut, ExternalLink, Share2 } from 'lucide-react'
import Link from 'next/link'

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

export default function StoreDashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { store, loading: storeLoading, updateStore } = useStore()

  const [authed,  setAuthed]  = useState<boolean | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Form state (populated from store once loaded)
  const [logo,        setLogo]        = useState('🏪')
  const [cover,       setCover]       = useState(COVER_GRADIENTS[0].value)
  const [name,        setName]        = useState('')
  const [city,        setCity]        = useState('')
  const [address,     setAddress]     = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [website,     setWebsite]     = useState('')
  const [description, setDescription] = useState('')
  const [hours,       setHours]       = useState('')
  const [instagram,   setInstagram]   = useState('')
  const [facebook,    setFacebook]    = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else setAuthed(true)
    })
  }, [supabase, router])

  // Populate form when store data loads
  useEffect(() => {
    if (store) {
      setLogo(store.logo)
      setCover(store.cover_color)
      setName(store.name)
      setCity(store.city)
      setAddress(store.address ?? '')
      setPhone(store.phone ?? '')
      setEmail(store.email ?? '')
      setWebsite(store.website ?? '')
      setDescription(store.description ?? '')
      setHours(store.hours ?? '')
      setInstagram(store.instagram ?? '')
      setFacebook(store.facebook ?? '')
      setSpecialties(store.specialties)
    }
  }, [store])

  const toggleSpecialty = (s: string) =>
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    if (!name.trim() || !city.trim()) { setError('Store name and city are required.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await updateStore({
      logo,
      cover_color: cover,
      name: name.trim(),
      city: city.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      hours: hours.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      specialties,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (authed === null || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🏪</span>
        <p className="text-white font-semibold text-center">No store profile found.</p>
        <a
          href="/stores/register"
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#e05a4e' }}
        >
          Create your store page →
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{store.logo}</span>
            <div>
              <h1 className="text-white font-bold leading-tight">{store.name}</h1>
              <p className="text-white/60 text-xs">{store.city}</p>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link
            href={`/stores/${store.id}`}
            className="flex items-center justify-center gap-1.5 bg-white rounded-xl py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <ExternalLink size={13} className="text-gray-400" />
            View public page
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: store.name, url: `${window.location.origin}/stores/${store.id}` })
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/stores/${store.id}`)
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-white rounded-xl py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <Share2 size={13} className="text-gray-400" />
            Share page
          </button>
        </div>

        {/* Edit profile card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4 mb-6">
          <h2 className="font-bold text-gray-900">Edit store profile</h2>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="h-16" style={{ background: cover }} />
            <div className="bg-gray-50 px-3 pb-3 pt-0">
              <div className="flex items-end gap-2 -mt-5 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">
                  {logo}
                </div>
                <p className="pb-0.5 text-xs font-bold text-gray-800">{name || 'Store name'}</p>
              </div>
            </div>
          </div>

          {/* Cover gradient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover color</label>
            <div className="flex gap-2">
              {COVER_GRADIENTS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setCover(g.value)}
                  className={`w-8 h-8 rounded-lg transition-all ${
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
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border-2 transition-all ${
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
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
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
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
              placeholder="Mon–Sat 10am–6pm"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">About your store</label>
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
                placeholder="yourpage"
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
            style={{ backgroundColor: saved ? '#22c55e' : '#e05a4e' }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saved ? '✓ Changes saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
