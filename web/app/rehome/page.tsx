'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { geocodeCity } from '@/lib/geocode'
import { Loader2, ArrowLeft, Check, Camera, X, Heart } from 'lucide-react'
import Link from 'next/link'
import type { PetSpecies } from '@/types'

const SPECIES_OPTIONS: { label: string; value: PetSpecies; emoji: string }[] = [
  { label: 'Dog',          value: 'dog',          emoji: '🐕' },
  { label: 'Cat',          value: 'cat',          emoji: '🐱' },
  { label: 'Rabbit',       value: 'rabbit',       emoji: '🐰' },
  { label: 'Bird',         value: 'bird',         emoji: '🦜' },
  { label: 'Small Animal', value: 'small_animal', emoji: '🐹' },
  { label: 'Other',        value: 'other',        emoji: '🐾' },
]

const COMMON_TRAITS = ['Friendly', 'House-trained', 'Good with kids', 'Good with dogs', 'Good with cats', 'Playful', 'Cuddly', 'Calm', 'Fixed', 'Vaccinated']

export default function RehomePage() {
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [userId, setUserId]   = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [saving, setSaving]   = useState(false)
  const [done,   setDone]     = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  const [name,    setName]    = useState('')
  const [species, setSpecies] = useState<PetSpecies>('dog')
  const [breed,   setBreed]   = useState('')
  const [age,     setAge]     = useState('')
  const [gender,  setGender]  = useState<'Male' | 'Female' | 'Unknown'>('Male')
  const [size,    setSize]    = useState<'Small' | 'Medium' | 'Large' | 'XL'>('Medium')
  const [city,    setCity]    = useState('')
  const [reason,  setReason]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [contact, setContact] = useState('')
  const [traits,  setTraits]  = useState<string[]>([])
  const [photo,   setPhoto]        = useState<File | null>(null)
  const [photoPreview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login?next=%2Frehome'); return }
      setUserId(data.user.id)
      setUserEmail(data.user.email ?? '')
      setContact(c => c || data.user.email || '')
    })
  }, [supabase, router])

  const toggleTrait = (t: string) =>
    setTraits(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const pickPhoto = (f: File | null) => {
    setPhoto(f)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const handleSubmit = async () => {
    if (!name.trim())    { setError('Your pet’s name is required.'); return }
    if (!city.trim())    { setError('City is required so nearby adopters can find them.'); return }
    if (!contact.trim()) { setError('A contact email is required.'); return }
    if (!userId) return

    setSaving(true)
    setError(null)

    // Photo upload (optional)
    let photos: string[] = []
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `rehome/${userId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, photo, { upsert: true })
      if (upErr) {
        setSaving(false)
        setError(`Photo upload failed: ${upErr.message}`)
        return
      }
      photos = [supabase.storage.from('pet-photos').getPublicUrl(path).data.publicUrl]
    }

    const coords = await geocodeCity(city)

    const { error: insErr } = await supabase.from('pets').insert({
      owner_id:      userId,
      rescue_id:     null,
      name:          name.trim(),
      species,
      breed:         breed.trim() || null,
      age:           age.trim() || null,
      gender,
      size,
      description:   desc.trim() || null,
      rehome_reason: reason.trim() || null,
      contact_email: contact.trim(),
      city:          city.trim(),
      lat:           coords?.lat ?? null,
      lon:           coords?.lon ?? null,
      fee:           null,
      traits,
      photos,
      good_with:     [],
      status:        'available',
    })

    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">💛</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{name} is listed!</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Your pet now appears in the browse queue for adopters near {city}.
            You&apos;ll get applications at <strong>{contact}</strong>.
          </p>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#e05a4e' }}
          >
            Back to browse
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-white">Rehome your pet</h1>
        </div>

        <div className="bg-white/90 rounded-2xl px-4 py-3 mb-4 flex items-start gap-2.5">
          <Heart size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#e05a4e' }} />
          <p className="text-xs text-gray-600 leading-relaxed">
            Sometimes life changes and a pet needs a new home — that&apos;s okay.
            Your listing appears alongside rescue animals for adopters near you.
            <strong> Never charge a rehoming fee above basic costs; selling animals is not allowed.</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden h-44">
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => pickPhoto(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-gray-300 transition-colors">
                <Camera size={22} className="text-gray-300" />
                <span className="text-xs text-gray-400">Add a photo — listings with photos get 5× more interest</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => pickPhoto(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pet&apos;s name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
            />
          </div>

          {/* Species */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
            <div className="flex flex-wrap gap-1.5">
              {SPECIES_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSpecies(s.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    species === s.value ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                  style={species === s.value ? { backgroundColor: '#e05a4e' } : {}}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breed + age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Breed</label>
              <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Lab Mix"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
              <input value={age} onChange={e => setAge(e.target.value)} placeholder="3 Years"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none placeholder:text-gray-400" />
            </div>
          </div>

          {/* Gender + size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
              <div className="flex gap-1.5">
                {(['Male', 'Female'] as const).map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      gender === g ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                    style={gender === g ? { backgroundColor: '#e05a4e' } : {}}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size</label>
              <select value={size} onChange={e => setSize(e.target.value as typeof size)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none bg-white">
                {['Small', 'Medium', 'Large', 'XL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="San Diego, CA"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-400" />
          </div>

          {/* Traits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TRAITS.map(t => (
                <button key={t} onClick={() => toggleTrait(t)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    traits.includes(t) ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                  style={traits.includes(t) ? { backgroundColor: '#e05a4e' } : {}}>
                  {traits.includes(t) && <Check size={10} />}{t}
                </button>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">About your pet</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="What makes them special? Habits, favorite things, what kind of home would suit them…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:text-gray-400" />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Why are you rehoming? <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Moving, allergies, new baby… adopters appreciate honesty."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:text-gray-400" />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact email *</label>
            <input type="email" value={contact} onChange={e => setContact(e.target.value)}
              placeholder={userEmail || 'you@example.com'}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-400" />
            <p className="text-[11px] text-gray-400 mt-1">Shown to interested adopters on your pet&apos;s page.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <button
            onClick={handleSubmit} disabled={saving}
            className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            List {name.trim() || 'my pet'} for adoption 💛
          </button>
        </div>
      </div>
    </div>
  )
}
