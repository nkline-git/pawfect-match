'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Loader2, ArrowLeft, Check, SlidersHorizontal, Shield } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'

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

export default function ProfilePage() {
  const router  = useRouter()
  const supabase = createClient()
  const { profile, loading, updateProfile } = useProfile()

  const [authed, setAuthed]     = useState<boolean | null>(null)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // form state
  const [firstName, setFirstName]       = useState('')
  const [city, setCity]                 = useState('')
  const [bio, setBio]                   = useState('')
  const [avatar, setAvatar]             = useState('🙂')
  const [lifestyle, setLifestyle]       = useState<string[]>([])
  const [searchRadius, setSearchRadius] = useState(100)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setAuthed(true)
      }
    })
  }, [supabase, router])

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name)
      setCity(profile.city)
      setBio(profile.bio ?? '')
      setAvatar(profile.avatar)
      setLifestyle(profile.lifestyle)
      setSearchRadius(profile.notification_prefs?.search_radius ?? 100)
    }
  }, [profile])

  const toggleLifestyle = (item: string) =>
    setLifestyle(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    )

  const handleSave = async () => {
    if (!firstName.trim() || !city.trim()) {
      setSaveError('Name and city are required.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const wasSetup = isSetup
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
    })
    setSaving(false)
    if (error) { setSaveError(error); return }
    setEditing(false)
    // New users: go set pet preferences after profile setup
    if (wasSetup) {
      router.push('/onboarding')
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
          <a href="/" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft size={18} />
          </a>
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

              {/* City */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="San Diego, CA"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Search radius */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Search radius — <span style={{ color: '#e05a4e' }}>{searchRadius} miles</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={10}
                  value={searchRadius}
                  onChange={e => setSearchRadius(Number(e.target.value))}
                  className="w-full accent-[#e05a4e]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10 mi</span>
                  <span>250 mi</span>
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
