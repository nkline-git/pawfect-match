'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRescue } from '@/hooks/useRescue'
import { usePets } from '@/hooks/usePets'
import {
  PlusCircle, Loader2, Check, X, LogOut,
  Users, Heart, Home, Bell, UserCog, ExternalLink,
  Calendar, MapPin, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import type { Pet, PetSpecies } from '@/types'

const LOGO_OPTIONS = ['🏠', '🐾', '🐕', '🐱', '🐰', '🦮', '🐕‍🦺', '🏡', '💛', '🌟']
const BANNER_GRADIENTS = [
  { label: 'Ocean',   value: 'linear-gradient(135deg,#1A4A9C,#2D7DD2)' },
  { label: 'Coral',   value: 'linear-gradient(135deg,#e05a4e,#c44b40)' },
  { label: 'Forest',  value: 'linear-gradient(135deg,#059669,#10b981)' },
  { label: 'Purple',  value: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { label: 'Sunset',  value: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { label: 'Slate',   value: 'linear-gradient(135deg,#374151,#6b7280)' },
]
const ANIMAL_TYPES = ['Dogs', 'Cats', 'Rabbits', 'Birds', 'Reptiles', 'Small Animals', 'Farm Animals']

type Application = {
  id: string
  status: string
  created_at: string
  message: string | null
  pet: { name: string; species: string } | null
  profile: { first_name: string; city: string; avatar: string; bio: string | null } | null
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', bird: '🦜',
  reptile: '🦎', small_animal: '🐹', farm: '🐄', other: '🐾',
}

const SPECIES_OPTIONS: { label: string; value: PetSpecies }[] = [
  { label: 'Dog',          value: 'dog'          },
  { label: 'Cat',          value: 'cat'          },
  { label: 'Rabbit',       value: 'rabbit'       },
  { label: 'Bird',         value: 'bird'         },
  { label: 'Reptile',      value: 'reptile'      },
  { label: 'Small Animal', value: 'small_animal' },
  { label: 'Farm Animal',  value: 'farm'         },
  { label: 'Other',        value: 'other'        },
]

const COMMON_TRAITS = ['Friendly', 'Trained', 'Playful', 'Cuddly', 'Indoor', 'Quiet', 'Gentle', 'Energetic', 'Good with kids', 'House-trained']

type NewPet = {
  name: string
  species: PetSpecies
  breed: string
  age: string
  gender: 'Male' | 'Female' | 'Unknown'
  size: 'Small' | 'Medium' | 'Large' | 'XL'
  description: string
  fee: string
  traits: string[]
  photo: File | null
  photoPreview: string | null
}

// ── Events manager: adoption events, fundraisers, volunteer days ──
const EVENT_TYPES = [
  { value: 'adoption_event', label: '🐾 Adoption Event' },
  { value: 'fundraiser',     label: '💰 Fundraiser'     },
  { value: 'volunteer_day',  label: '🤝 Volunteer Day'  },
  { value: 'training',       label: '🎓 Training'       },
  { value: 'meetup',         label: '☕ Meetup'          },
  { value: 'other',          label: '📅 Other'          },
]

type RescueEvent = {
  id: string
  title: string
  event_type: string
  location: string | null
  starts_at: string
  status: string
}

function EventsManager({ rescueId, userId }: { rescueId: string; userId: string }) {
  const supabase = createClient()
  const [events,   setEvents]   = useState<RescueEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [eTitle,    setETitle]    = useState('')
  const [eType,     setEType]     = useState('adoption_event')
  const [eLocation, setELocation] = useState('')
  const [eDate,     setEDate]     = useState('')
  const [eTime,     setETime]     = useState('')
  const [eDesc,     setEDesc]     = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_type, location, starts_at, status')
      .eq('rescue_id', rescueId)
      .order('starts_at', { ascending: true })
      .limit(20)
    if (!error) setEvents((data ?? []) as RescueEvent[])
    setLoading(false)
  }
  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueId])

  const addEvent = async () => {
    if (!eTitle.trim()) { setError('Event title is required.'); return }
    if (!eDate)         { setError('Event date is required.'); return }
    setSaving(true); setError(null)
    const startsAt = new Date(`${eDate}T${eTime || '12:00'}`)
    const { error } = await supabase.from('events').insert({
      user_id:     userId,
      rescue_id:   rescueId,
      title:       eTitle.trim(),
      description: eDesc.trim() || null,
      event_type:  eType,
      location:    eLocation.trim() || null,
      starts_at:   startsAt.toISOString(),
      status:      'active',
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setETitle(''); setELocation(''); setEDate(''); setETime(''); setEDesc(''); setEType('adoption_event')
    setShowForm(false)
    load()
  }

  const cancelEvent = async (id: string) => {
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  const removeEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    load()
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-white/80 text-sm font-semibold">Your events</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full text-white bg-white/20 hover:bg-white/30 transition-colors"
        >
          <PlusCircle size={12} /> {showForm ? 'Close' : 'New event'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
          <input
            value={eTitle} onChange={e => setETitle(e.target.value)}
            placeholder="Event title * (e.g. Spring Adoption Day)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map(t => (
              <button key={t.value} onClick={() => setEType(t.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  eType === t.value ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
                style={eType === t.value ? { backgroundColor: '#e05a4e' } : {}}>{t.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date" value={eDate} onChange={e => setEDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700"
            />
            <input
              type="time" value={eTime} onChange={e => setETime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700"
            />
          </div>
          <input
            value={eLocation} onChange={e => setELocation(e.target.value)}
            placeholder="Location (e.g. Central Park, Wichita)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <textarea
            value={eDesc} onChange={e => setEDesc(e.target.value)}
            placeholder="Details (optional)" rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={addEvent} disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Publish event
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-4 text-center">
          <Loader2 size={16} className="animate-spin text-gray-300 mx-auto" />
        </div>
      ) : events.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No events yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Adoption days and fundraisers you post here show up<br />
            on your public page and the Community tab.
          </p>
        </div>
      ) : (
        events.map(ev => {
          const past = new Date(ev.starts_at) < new Date()
          const typeMeta = EVENT_TYPES.find(t => t.value === ev.event_type)
          return (
            <div key={ev.id} className={`bg-white rounded-2xl shadow-sm px-4 py-3 ${ev.status === 'cancelled' || past ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {typeMeta?.label ?? ev.event_type} · {fmtDate(ev.starts_at)}
                    {past && ' · past'}
                  </p>
                  {ev.location && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {ev.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {ev.status === 'cancelled' ? (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Cancelled</span>
                  ) : !past && (
                    <button onClick={() => cancelEvent(ev.id)}
                      className="text-[10px] font-semibold text-amber-600 border border-amber-200 px-2 py-1 rounded-full hover:bg-amber-50">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => removeEvent(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

const EMPTY_PET: NewPet = {
  name: '', species: 'dog', breed: '', age: '', gender: 'Male',
  size: 'Medium', description: '', fee: '', traits: [],
  photo: null, photoPreview: null,
}

export default function RescueDashboardPage() {
  const router        = useRouter()
  const supabaseRef   = useRef(createClient())
  const supabase      = supabaseRef.current
  const { rescue, loading: rescueLoading, updateRescue } = useRescue()
  const { pets, loading: petsLoading, refetch } = usePets({ rescueId: rescue?.id })

  const [authed, setAuthed]     = useState<boolean | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)
  const [tab, setTab]           = useState<'listings' | 'applications' | 'events' | 'profile'>('listings')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<NewPet>({ ...EMPTY_PET })
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [appsLoading, setAppsLoading]   = useState(false)

  // Profile edit state
  const [pLogo,        setPLogo]        = useState('🏠')
  const [pBanner,      setPBanner]      = useState(BANNER_GRADIENTS[0].value)
  const [pName,        setPName]        = useState('')
  const [pCity,        setPCity]        = useState('')
  const [pMission,     setPMission]     = useState('')
  const [pPhone,       setPPhone]       = useState('')
  const [pEmail,       setPEmail]       = useState('')
  const [pWebsite,     setPWebsite]     = useState('')
  const [pHours,       setPHours]       = useState('')
  const [pFeeRange,    setPFeeRange]    = useState('')
  const [pAnimalTypes, setPAnimalTypes] = useState<string[]>([])
  const [pReqNotes,    setPReqNotes]    = useState('')
  const [pSaving,      setPSaving]      = useState(false)
  const [pSaved,       setPSaved]       = useState(false)
  const [pError,       setPError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login?next=%2Frescue%2Fdashboard')
      else { setAuthed(true); setUserId(data.user.id) }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Populate profile form when rescue loads
  useEffect(() => {
    if (rescue) {
      setPLogo(rescue.logo)
      setPBanner(rescue.banner_gradient ?? BANNER_GRADIENTS[0].value)
      setPName(rescue.name)
      setPCity(rescue.city)
      setPMission(rescue.mission ?? '')
      setPPhone(rescue.phone ?? '')
      setPEmail(rescue.email ?? '')
      setPWebsite(rescue.website ?? '')
      setPHours(rescue.hours ?? '')
      setPFeeRange(rescue.fee_range ?? '')
      setPAnimalTypes(rescue.animal_types ?? [])
      setPReqNotes(rescue.requirement_notes ?? '')
    }
  }, [rescue])

  // Load applications when tab switches or rescue loads
  useEffect(() => {
    if (tab !== 'applications' || !rescue) return
    const load = async () => {
      setAppsLoading(true)
      const { data } = await supabase
        .from('applications')
        .select('id, status, created_at, message, pet:pets(name, species), profile:profiles(first_name, city, avatar, bio)')
        .eq('rescue_id', rescue.id)
        .order('created_at', { ascending: false })
      setApplications((data ?? []) as unknown as Application[])
      setAppsLoading(false)
    }
    load()
  }, [tab, rescue, supabase])

  const updateAppStatus = async (appId: string, status: string) => {
    await supabase.from('applications').update({ status }).eq('id', appId)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
  }

  const handleProfileSave = async () => {
    if (!pName.trim() || !pCity.trim()) { setPError('Name and city are required.'); return }
    setPSaving(true)
    setPError(null)
    const { error: err } = await updateRescue({
      logo:              pLogo,
      banner_gradient:   pBanner,
      name:              pName.trim(),
      city:              pCity.trim(),
      ...(await import('@/lib/geocode').then(m => m.geocodeCity(pCity)).then(c => c ? { lat: c.lat, lon: c.lon } : {})),
      mission:           pMission.trim() || null,
      phone:             pPhone.trim() || null,
      email:             pEmail.trim() || null,
      website:           pWebsite.trim() || null,
      hours:             pHours.trim() || null,
      fee_range:         pFeeRange.trim() || null,
      animal_types:      pAnimalTypes,
      requirement_notes: pReqNotes.trim() || null,
    })
    setPSaving(false)
    if (err) { setPError(err); return }
    setPSaved(true)
    setTimeout(() => setPSaved(false), 3000)
  }

  const setField = <K extends keyof NewPet>(key: K, val: NewPet[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const toggleTrait = (t: string) =>
    setField('traits', form.traits.includes(t)
      ? form.traits.filter(x => x !== t)
      : [...form.traits, t])

  const handleAddPet = async () => {
    if (!form.name.trim()) { setFormError('Pet name is required.'); return }
    if (!rescue)           { setFormError('No rescue profile found.'); return }

    setSaving(true)
    setFormError(null)

    // Upload photo if provided
    let photos: string[] = []
    if (form.photo) {
      const ext  = form.photo.name.split('.').pop()
      const path = `${rescue.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(path, form.photo, { upsert: true })

      if (uploadError) {
        setSaving(false)
        setFormError(`Photo upload failed: ${uploadError.message}. Make sure the "pet-photos" bucket exists in Supabase Storage and is set to Public.`)
        return
      }

      const { data: urlData } = supabase.storage.from('pet-photos').getPublicUrl(path)
      photos = [urlData.publicUrl]
    }

    const feeInCents = form.fee ? Math.round(parseFloat(form.fee) * 100) : null

    const { error } = await supabase.from('pets').insert({
      rescue_id:   rescue.id,
      name:        form.name.trim(),
      species:     form.species,
      breed:       form.breed.trim() || null,
      age:         form.age.trim() || null,
      gender:      form.gender,
      size:        form.size,
      description: form.description.trim() || null,
      fee:         feeInCents,
      traits:      form.traits,
      photos,
      good_with:   [],
      status:      'available',
    })

    setSaving(false)
    if (error) { setFormError(error.message); return }

    // Update rescue animal count
    await supabase.from('rescues').update({
      stats: { ...rescue.stats, animals: rescue.stats.animals + 1 },
    }).eq('id', rescue.id)

    setForm({ ...EMPTY_PET })
    setShowForm(false)
    refetch()
  }

  const markAdopted = async (petId: string) => {
    await supabase.from('pets').update({ status: 'adopted' }).eq('id', petId)
    if (rescue) {
      await supabase.from('rescues').update({
        stats: {
          ...rescue.stats,
          placed:  rescue.stats.placed + 1,
          animals: Math.max(0, rescue.stats.animals - 1),
        },
      }).eq('id', rescue.id)
    }
    refetch()
  }

  if (authed === null || rescueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!rescue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🏠</span>
        <p className="text-white font-semibold text-center">No rescue profile found.</p>
        <a
          href="/rescue/verify"
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#e05a4e' }}
        >
          Set up your rescue →
        </a>
      </div>
    )
  }

  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{rescue.logo}</span>
            <div>
              <h1 className="text-white font-bold leading-tight">{rescue.name}</h1>
              <Link href={`/rescues/${rescue.id}`} className="text-white/60 text-xs flex items-center gap-1 hover:text-white/80">
                {rescue.city} <ExternalLink size={10} />
              </Link>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Animals',  value: rescue.stats.animals, icon: Home },
            { label: 'Placed',   value: rescue.stats.placed,  icon: Heart },
            { label: 'Apps',     value: rescue.stats.apps,    icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <Icon size={16} className="mx-auto mb-1 text-gray-400" />
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Verification badge */}
        {!rescue.verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Verification pending</p>
              <p className="text-xs text-amber-600">Our team is reviewing your EIN and 501(c)(3) status. You'll receive a verified badge once approved. Your listings are visible in the meantime.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm mb-4 p-1 gap-1">
          <button
            onClick={() => setTab('listings')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'listings' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === 'listings' ? { backgroundColor: '#e05a4e' } : {}}
          >
            Listings
          </button>
          <button
            onClick={() => setTab('applications')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === 'applications' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === 'applications' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Bell size={12} />
            Apps
          </button>
          <button
            onClick={() => setTab('events')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === 'events' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === 'events' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Calendar size={12} />
            Events
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === 'profile' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === 'profile' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <UserCog size={12} />
            Profile
          </button>
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto pb-2">

        {/* Events panel */}
        {tab === 'events' && userId && (
          <EventsManager rescueId={rescue.id} userId={userId} />
        )}

        {/* Applications panel */}
        {tab === 'applications' && (
          <div className="space-y-3 pb-6">
            {appsLoading ? (
              <div className="bg-white rounded-xl p-4 text-center">
                <Loader2 size={20} className="animate-spin text-gray-300 mx-auto" />
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <span className="text-3xl mb-2 block">📭</span>
                <p className="text-sm text-gray-500">No applications yet.</p>
              </div>
            ) : (
              applications.map(app => (
                <div key={app.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {app.profile?.avatar ?? '🙂'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{app.profile?.first_name ?? 'Someone'}</p>
                      <p className="text-xs text-gray-500">{app.profile?.city} · applied for <strong>{app.pet?.name}</strong></p>
                      {app.message && (
                        <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 line-clamp-3">
                          "{app.message}"
                        </p>
                      )}
                      {!app.message && app.profile?.bio && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{app.profile.bio}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      app.status === 'approved'  ? 'bg-green-100 text-green-700' :
                      app.status === 'rejected'  ? 'bg-red-100 text-red-500' :
                      app.status === 'reviewing' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAppStatus(app.id, 'reviewing')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => updateAppStatus(app.id, 'approved')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: '#22c55e' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateAppStatus(app.id, 'rejected')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {app.status === 'reviewing' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateAppStatus(app.id, 'approved')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: '#22c55e' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateAppStatus(app.id, 'rejected')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Add pet button */}
        {tab === 'listings' && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold mb-4 transition-all"
            style={{ backgroundColor: '#e05a4e' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#c44b40')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e05a4e')}
          >
            <PlusCircle size={16} />
            Add new pet listing
          </button>
        )}

        {/* Add pet form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">New pet listing</h2>
              <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_PET }); setFormError(null) }}
                className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Buddy"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Species</label>
                  <select
                    value={form.species}
                    onChange={e => setField('species', e.target.value as PetSpecies)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                  >
                    {SPECIES_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setField('gender', e.target.value as NewPet['gender'])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Breed</label>
                  <input
                    value={form.breed}
                    onChange={e => setField('breed', e.target.value)}
                    placeholder="Golden Retriever"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400"
                    onFocus={e => e.target.style.borderColor = '#e05a4e'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
                  <input
                    value={form.age}
                    onChange={e => setField('age', e.target.value)}
                    placeholder="2 yrs"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400"
                    onFocus={e => e.target.style.borderColor = '#e05a4e'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                  <select
                    value={form.size}
                    onChange={e => setField('size', e.target.value as NewPet['size'])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                  >
                    <option>Small</option>
                    <option>Medium</option>
                    <option>Large</option>
                    <option>XL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fee (USD)</label>
                  <input
                    type="number"
                    value={form.fee}
                    onChange={e => setField('fee', e.target.value)}
                    placeholder="150"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400"
                    onFocus={e => e.target.style.borderColor = '#e05a4e'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Tell adopters about this pet…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Traits</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TRAITS.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTrait(t)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        form.traits.includes(t)
                          ? 'text-white border-transparent'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={form.traits.includes(t) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                    >
                      {form.traits.includes(t) && <Check size={10} />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Photo <span className="text-gray-400 font-normal">(optional)</span></label>
                {form.photoPreview ? (
                  <div className="relative">
                    <img
                      src={form.photoPreview}
                      alt="Preview"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => setForm(f => ({ ...f, photo: null, photoPreview: null }))}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#e05a4e] hover:bg-red-50/30 transition-all">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-xs text-gray-400">Click to upload a photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null
                        if (file) {
                          setForm(f => ({
                            ...f,
                            photo: file,
                            photoPreview: URL.createObjectURL(file),
                          }))
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <button
                onClick={handleAddPet}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#e05a4e' }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Add listing
              </button>
            </div>
          </div>
        )}

        {/* ── Profile edit tab ── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4 mb-6">
            <h2 className="font-bold text-gray-900">Edit public profile</h2>

            {/* Banner preview */}
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="h-14" style={{ background: pBanner }} />
              <div className="bg-gray-50 px-3 pb-3 pt-0">
                <div className="flex items-end gap-2 -mt-5 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">
                    {pLogo}
                  </div>
                  <p className="pb-0.5 text-xs font-bold text-gray-800">{pName || 'Rescue name'}</p>
                </div>
              </div>
            </div>

            {/* Banner gradient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner color</label>
              <div className="flex gap-2">
                {BANNER_GRADIENTS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setPBanner(g.value)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      pBanner === g.value ? 'ring-2 ring-offset-1 ring-[#e05a4e] scale-110' : ''
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
                    onClick={() => setPLogo(l)}
                    className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border-2 transition-all ${
                      pLogo === l ? 'border-[#e05a4e] bg-red-50 scale-110' : 'border-transparent bg-gray-100 hover:bg-gray-200'
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
              <input value={pName} onChange={e => setPName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
              <input value={pCity} onChange={e => setPCity(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Mission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mission / About</label>
              <textarea value={pMission} onChange={e => setPMission(e.target.value)}
                placeholder="Saving one paw at a time…"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={pPhone} onChange={e => setPPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Website + Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                <input type="url" value={pWebsite} onChange={e => setPWebsite(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hours</label>
                <input value={pHours} onChange={e => setPHours(e.target.value)}
                  placeholder="Mon–Sat 10–5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                  onFocus={e => e.target.style.borderColor = '#e05a4e'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Fee range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adoption fee range</label>
              <input value={pFeeRange} onChange={e => setPFeeRange(e.target.value)}
                placeholder="$50–$200"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Animal types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Animals you rescue</label>
              <div className="flex flex-wrap gap-2">
                {ANIMAL_TYPES.map(t => (
                  <button key={t}
                    onClick={() => setPAnimalTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      pAnimalTypes.includes(t) ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={pAnimalTypes.includes(t) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                  >
                    {pAnimalTypes.includes(t) && <Check size={11} />}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Requirement notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adoption requirements <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={pReqNotes} onChange={e => setPReqNotes(e.target.value)}
                placeholder="e.g. Application required, home visit for large dogs…"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {pError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {pError}
              </div>
            )}

            <button
              onClick={handleProfileSave}
              disabled={pSaving}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: pSaved ? '#22c55e' : '#e05a4e' }}
            >
              {pSaving && <Loader2 size={16} className="animate-spin" />}
              {pSaved ? '✓ Saved!' : 'Save changes'}
            </button>
          </div>
        )}

        {/* Pet listings */}
        {tab === 'listings' && <div className="space-y-3 pb-6">
          {petsLoading ? (
            <div className="bg-white rounded-xl p-4 text-center">
              <Loader2 size={20} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : pets.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <span className="text-3xl mb-2 block">🐾</span>
              <p className="text-sm text-gray-500">No listings yet. Add your first pet above!</p>
            </div>
          ) : (
            pets.map(pet => (
              <div key={pet.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {pet.photos[0]
                    ? <img src={pet.photos[0]} alt="" className="w-full h-full object-cover rounded-full" />
                    : SPECIES_EMOJI[pet.species] ?? '🐾'
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{pet.name}</p>
                  <p className="text-xs text-gray-500">
                    {pet.breed ?? pet.species} · {pet.age ?? '?'} ·{' '}
                    <span className={`font-medium ${
                      pet.status === 'available' ? 'text-green-600' :
                      pet.status === 'pending'   ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {pet.status}
                    </span>
                  </p>
                </div>
                {pet.status === 'available' && (
                  <button
                    onClick={() => markAdopted(pet.id)}
                    className="flex-shrink-0 text-xs text-gray-400 hover:text-green-600 transition-colors flex flex-col items-center gap-0.5"
                    title="Mark as adopted"
                  >
                    <Check size={16} />
                    <span>Adopted</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>}

        </div>{/* end scrollable */}
      </div>
    </div>
  )
}
