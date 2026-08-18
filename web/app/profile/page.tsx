'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'
import { Loader2, ArrowLeft, Check, SlidersHorizontal, Shield, X, Plus, Trash2 } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import CityAutocomplete from '@/components/ui/CityAutocomplete'
import type { PetPreferences } from '@/types'
import { PENDING_PREFS_KEY } from '@/types'

const AVATARS = ['🙂', '😎', '🤗', '🧑', '👩', '👨', '🧔', '👱', '🙋', '🐾']

const LIFESTYLE_OPTIONS = [
  'Active / outdoorsy',
  'Homebody',
  'Work from home',
  'Frequent traveler',
  'Have kids',
  'Have other pets',
  'Large yard',
  'Apartment',
]

const POPULAR_BREEDS = [
  // Dogs
  'Golden Retriever', 'Labrador', 'German Shepherd', 'French Bulldog',
  'Bulldog', 'Beagle', 'Husky', 'Poodle', 'Chihuahua', 'Dachshund',
  'Border Collie', 'Shih Tzu', 'Corgi', 'Poodle Mix', 'Shepherd Mix',
  // Cats
  'Tabby', 'Siamese', 'Maine Coon', 'Persian', 'Ragdoll',
  'Bengal', 'British Shorthair', 'Domestic Shorthair', 'Domestic Longhair',
]

export default function ProfilePage() {
  const router  = useRouter()
  const [supabase] = useState(createClient)
  const { profile, loading, updateProfile } = useProfile()

  const [authed, setAuthed]     = useState<boolean | null>(null)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  // form state
  const [firstName, setFirstName]       = useState('')
  const [city, setCity]                 = useState('')
  const [bio, setBio]                   = useState('')
  const [avatar, setAvatar]             = useState('🙂')
  const [lifestyle, setLifestyle]       = useState<string[]>([])
  const [searchRadius, setSearchRadius] = useState(100)
  const [breeds, setBreeds]             = useState<string[]>([])
  const [breedInput, setBreedInput]     = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setAuthed(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      // Intentional: mirrors fetched profile into local editable-form state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(profile.first_name)
      setCity(profile.city)
      setBio(profile.bio ?? '')
      setAvatar(profile.avatar)
      setLifestyle(profile.lifestyle)
      setSearchRadius(profile.notification_prefs?.search_radius ?? 100)
      setBreeds(profile.preferences?.breeds ?? [])
    }
  }, [profile])

  const toggleLifestyle = (item: string) =>
    setLifestyle(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    )

  const addBreed = (breed: string) => {
    const trimmed = breed.trim()
    if (!trimmed) return
    // Normalise casing: capitalise each word
    const normalised = trimmed.replace(/\b\w/g, c => c.toUpperCase())
    if (breeds.some(b => b.toLowerCase() === normalised.toLowerCase())) return
    setBreeds(prev => [...prev, normalised])
    setBreedInput('')
  }

  const removeBreed = (breed: string) =>
    setBreeds(prev => prev.filter(b => b !== breed))

  const handleSave = async () => {
    if (!firstName.trim() || !city.trim()) {
      setSaveError('Name and city are required.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const wasSetup = isSetup
    // Quiz answers saved before the profile row existed (new OAuth users
    // finish /onboarding first) — persist them with this first save
    let pendingPrefs: PetPreferences | null = null
    try { pendingPrefs = JSON.parse(localStorage.getItem(PENDING_PREFS_KEY) ?? 'null') } catch { /* noop */ }
    const { error } = await updateProfile({
      first_name: firstName.trim(),
      city: city.trim(),
      bio: bio.trim() || null,
      avatar,
      lifestyle,
      notification_prefs: {
        ...(profile?.notification_prefs ?? { matches: true, events: true, community: false, deals: true }),
        search_radius: searchRadius,
      },
      // Merge breeds into existing preferences without clobbering other fields
      preferences: profile?.preferences
        ? { ...profile.preferences, breeds }
        : pendingPrefs
          ? { ...pendingPrefs, breeds }
          : breeds.length > 0
            ? { species: [], breeds, size: [], age: [], energy: [], good_with_kids: null, good_with_dogs: null, good_with_cats: null, housing: null }
            : null,
    })
    setSaving(false)
    if (error) { setSaveError(error); return }
    try { localStorage.removeItem(PENDING_PREFS_KEY) } catch { /* noop */ }
    setEditing(false)
    // New users: go set pet preferences after profile setup —
    // unless they already answered the quiz before landing here
    if (wasSetup) {
      router.push(pendingPrefs ? '/' : '/onboarding')
    }
  }

  if (authed === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  const isSetup = !profile
  const showForm = isSetup || editing

  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-white">
            {isSetup ? 'Set up your profile' : 'Your profile'}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-2">
        <div className="bg-white rounded-2xl shadow-lg p-6">

          {showForm ? (
            <>
              {/* Avatar picker */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-full text-xl flex items-center justify-center border-2 transition-all ${
                        avatar === a ? 'border-[#e05a4e] bg-red-50 scale-110' : 'border-transparent bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* City — validated suggestions so radius search can geocode it */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <CityAutocomplete value={city} onChange={setCity} />
                <p className="text-[11px] text-gray-400 mt-1">Pick from the suggestions so distance search works reliably.</p>
              </div>

              {/* Search radius */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Search radius — <span style={{ color: '#e05a4e' }}>{searchRadius} miles</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={searchRadius}
                  onChange={e => setSearchRadius(Number(e.target.value))}
                  className="w-full accent-[#e05a4e]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10 mi</span>
                  <span>500 mi</span>
                </div>
              </div>

              {/* Breed preferences */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Breed preferences <span className="text-gray-400 font-normal">(optional)</span>
                </label>

                {/* Selected breeds */}
                {breeds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {breeds.map(b => (
                      <span
                        key={b}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                        style={{ backgroundColor: '#e05a4e' }}
                      >
                        {b}
                        <button
                          type="button"
                          onClick={() => removeBreed(b)}
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Text input */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={breedInput}
                    onChange={e => setBreedInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBreed(breedInput) } }}
                    placeholder="Type a breed and press Enter…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400"
                    onFocus={e => e.target.style.borderColor = '#e05a4e'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button
                    type="button"
                    onClick={() => addBreed(breedInput)}
                    disabled={!breedInput.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick-select popular breeds */}
                <p className="text-[11px] text-gray-400 mb-1.5">Popular breeds:</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {POPULAR_BREEDS.filter(b => !breeds.includes(b)).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => addBreed(b)}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-all whitespace-nowrap"
                    >
                      + {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell rescues a little about yourself…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Lifestyle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lifestyle</label>
                <div className="flex flex-wrap gap-2">
                  {LIFESTYLE_OPTIONS.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleLifestyle(item)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        lifestyle.includes(item)
                          ? 'text-white border-transparent'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={lifestyle.includes(item) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                    >
                      {lifestyle.includes(item) && <Check size={11} />}
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                  {saveError}
                </div>
              )}

              <div className="flex gap-3">
                {editing && (
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#e05a4e' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isSetup ? 'Save profile' : 'Save changes'}
                </button>
              </div>
            </>
          ) : (
            /* Profile view */
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                  {profile!.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{profile!.first_name}</h2>
                  <p className="text-sm text-gray-500">{profile!.city}</p>
                </div>
              </div>

              {profile!.bio && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{profile!.bio}</p>
              )}

              {profile!.lifestyle.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {profile!.lifestyle.map(item => (
                    <span key={item} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {/* Pet preferences summary */}
              <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600">Pet preferences</span>
                  </div>
                  <a href="/onboarding" className="text-xs font-medium hover:underline" style={{ color: '#e05a4e' }}>
                    {profile!.preferences ? 'Update' : 'Set now →'}
                  </a>
                </div>
                {profile!.preferences ? (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {[
                      profile!.preferences.species.length > 0 && profile!.preferences.species.join(', '),
                      profile!.preferences.breeds && profile!.preferences.breeds.length > 0 && profile!.preferences.breeds.join(', '),
                      profile!.preferences.size.length > 0 && profile!.preferences.size.join(' / '),
                      profile!.preferences.energy.length > 0 && profile!.preferences.energy.join(' / ') + ' energy',
                    ].filter(Boolean).join(' · ') || 'Open to all'}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Not set — your feed shows all pets</p>
                )}
              </div>

              <button
                onClick={() => setEditing(true)}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit profile
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <Link
                  href="/rehome"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  💛 Rehome my pet
                </Link>
                {(profile!.role === 'admin' || profile!.role === 'moderator') && (
                  <a
                    href="/admin"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Shield size={15} />
                    Moderation dashboard
                  </a>
                )}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.replace('/login')
                  }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sign out
                </button>

                {/* Delete account — required for Apple/Google app stores */}
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} /> Delete my account
                  </button>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-800">Delete your account?</p>
                    <p className="text-xs text-red-600 leading-relaxed">
                      This permanently deletes your profile, saved pets, and all data. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true)
                          try {
                            const res = await fetch('/api/account/delete', { method: 'DELETE' })
                            if (res.ok) {
                              await supabase.auth.signOut()
                              // Clear localStorage data
                              localStorage.removeItem('pawfect_saved_rg')
                              localStorage.removeItem('pawfect_seen_rg')
                              localStorage.removeItem('pawfect_city')
                              router.replace('/login')
                            }
                          } finally {
                            setDeleting(false)
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Legal links */}
                <div className="flex justify-center gap-4 text-[11px] text-gray-400 pt-1">
                  <Link href="/privacy" className="hover:text-gray-600 underline">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-gray-600 underline">Terms of Service</Link>
                </div>
              </div>
            </>
          )}
        </div>

        </div>{/* end scrollable */}
        <BottomNav />
      </div>
    </div>
  )
}
