'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/ui/BottomNav'
import {
  Loader2, MapPin, Camera, X, Check, Phone, Mail,
  Users, Megaphone, PartyPopper,
} from 'lucide-react'

const SPECIES = [
  { value: 'dog',          label: 'Dog',    emoji: '🐕' },
  { value: 'cat',          label: 'Cat',    emoji: '🐱' },
  { value: 'rabbit',       label: 'Rabbit', emoji: '🐰' },
  { value: 'bird',         label: 'Bird',   emoji: '🦜' },
  { value: 'small_animal', label: 'Small',  emoji: '🐹' },
  { value: 'other',        label: 'Other',  emoji: '🐾' },
]
const SPECIES_EMOJI: Record<string, string> = Object.fromEntries(SPECIES.map(s => [s.value, s.emoji]))

type LostPet = {
  id: string
  user_id: string
  name: string
  species: string
  breed: string | null
  color: string | null
  photo_url: string | null
  description: string | null
  last_seen_location: string
  last_seen_at: string
  contact_email: string | null
  contact_phone: string | null
  reward: string | null
  status: 'missing' | 'found'
  created_at: string
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export default function SosPage() {
  const router      = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [userId,    setUserId]    = useState<string | null>(null)
  const [alerts,    setAlerts]    = useState<LostPet[]>([])
  const [searchers, setSearchers] = useState<Record<string, number>>({})
  const [joined,    setJoined]    = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [dbMissing, setDbMissing] = useState(false)
  const [tab,       setTab]       = useState<'missing' | 'found'>('missing')

  // Report form
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [fName,    setFName]    = useState('')
  const [fSpecies, setFSpecies] = useState('dog')
  const [fBreed,   setFBreed]   = useState('')
  const [fColor,   setFColor]   = useState('')
  const [fLoc,     setFLoc]     = useState('')
  const [fDate,    setFDate]    = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fPhone,   setFPhone]   = useState('')
  const [fEmail,   setFEmail]   = useState('')
  const [fReward,  setFReward]  = useState('')
  const [fPhoto,   setFPhoto]   = useState<File | null>(null)
  const [fPreview, setFPreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('lost_pets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) { setDbMissing(true); setLoading(false); return }
    setAlerts((data ?? []) as LostPet[])

    // Searcher counts + own membership
    const { data: rows } = await supabase.from('lost_pet_searchers').select('lost_pet_id, user_id')
    const counts: Record<string, number> = {}
    const mine = new Set<string>()
    const { data: { user } } = await supabase.auth.getUser()
    for (const r of rows ?? []) {
      counts[r.lost_pet_id] = (counts[r.lost_pet_id] ?? 0) + 1
      if (user && r.user_id === user.id) mine.add(r.lost_pet_id)
    }
    setSearchers(counts)
    setJoined(mine)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      if (data.user?.email) setFEmail(e => e || data.user!.email!)
    })
    load()
  }, [supabase, load])

  const pickPhoto = (f: File | null) => {
    setFPhoto(f)
    if (fPreview) URL.revokeObjectURL(fPreview)
    setFPreview(f ? URL.createObjectURL(f) : null)
  }

  const submitAlert = async () => {
    if (!userId) { router.push('/login?next=%2Fsos'); return }
    if (!fName.trim()) { setError('Pet name is required.'); return }
    if (!fLoc.trim())  { setError('Last-seen location is required.'); return }
    setSaving(true); setError(null)

    let photoUrl: string | null = null
    if (fPhoto) {
      const ext  = fPhoto.name.split('.').pop()
      const path = `lost/${userId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, fPhoto, { upsert: true })
      if (upErr) { setSaving(false); setError(`Photo upload failed: ${upErr.message}`); return }
      photoUrl = supabase.storage.from('pet-photos').getPublicUrl(path).data.publicUrl
    }

    const { error: insErr } = await supabase.from('lost_pets').insert({
      user_id: userId,
      name: fName.trim(),
      species: fSpecies,
      breed: fBreed.trim() || null,
      color: fColor.trim() || null,
      photo_url: photoUrl,
      description: fDesc.trim() || null,
      last_seen_location: fLoc.trim(),
      last_seen_at: fDate ? new Date(fDate).toISOString() : new Date().toISOString(),
      contact_email: fEmail.trim() || null,
      contact_phone: fPhone.trim() || null,
      reward: fReward.trim() || null,
      status: 'missing',
    })
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setFName(''); setFBreed(''); setFColor(''); setFLoc(''); setFDate(''); setFDesc(''); setFPhone(''); setFReward('')
    pickPhoto(null)
    setShowForm(false)
    load()
  }

  const toggleJoin = async (alert: LostPet) => {
    if (!userId) { router.push('/login?next=%2Fsos'); return }
    if (joined.has(alert.id)) {
      await supabase.from('lost_pet_searchers').delete().eq('lost_pet_id', alert.id).eq('user_id', userId)
    } else {
      await supabase.from('lost_pet_searchers').insert({ lost_pet_id: alert.id, user_id: userId })
    }
    load()
  }

  const markFound = async (alert: LostPet) => {
    await supabase.from('lost_pets').update({ status: 'found' }).eq('id', alert.id)
    load()
  }

  const removeAlert = async (alert: LostPet) => {
    await supabase.from('lost_pets').delete().eq('id', alert.id)
    load()
  }

  const shown = alerts.filter(a => a.status === tab)

  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🚨</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Lost Pet</span>
              <span className="text-gray-900"> SOS</span>
            </span>
          </div>
          <button
            onClick={() => userId ? setShowForm(v => !v) : router.push('/login?next=%2Fsos')}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white"
            style={{ backgroundColor: '#dc2626' }}
          >
            <Megaphone size={12} /> {showForm ? 'Close' : 'Report lost pet'}
          </button>
        </header>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm mb-3 p-1 gap-1 flex-shrink-0">
          {(['missing', 'found'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'text-white' : 'text-gray-500'
              }`}
              style={tab === t ? { backgroundColor: t === 'missing' ? '#dc2626' : '#22c55e' } : {}}
            >
              {t === 'missing' ? '🔍 Missing' : '🎉 Reunited'}
              {t === 'missing' && alerts.filter(a => a.status === 'missing').length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === t ? 'bg-white/25' : 'bg-red-100 text-red-600'}`}>
                  {alerts.filter(a => a.status === 'missing').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-2 space-y-3">

          {dbMissing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚙️ One-time setup needed</p>
              <p className="text-xs">Run <code className="bg-amber-100 px-1 rounded">009_lost_pets.sql</code> in your Supabase SQL editor.</p>
            </div>
          )}

          {/* Report form */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
              <p className="text-sm font-bold text-gray-900">🚨 Report a lost pet</p>
              {fPreview ? (
                <div className="relative rounded-xl overflow-hidden h-36">
                  <img src={fPreview} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => pickPhoto(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-5 cursor-pointer hover:border-gray-300">
                  <Camera size={18} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Add a recent photo — crucial for sightings</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0] ?? null)} />
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Pet's name *"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                <input value={fBreed} onChange={e => setFBreed(e.target.value)} placeholder="Breed"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPECIES.map(s => (
                  <button key={s.value} onClick={() => setFSpecies(s.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      fSpecies === s.value ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                    style={fSpecies === s.value ? { backgroundColor: '#dc2626' } : {}}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={fColor} onChange={e => setFColor(e.target.value)} placeholder="Color / markings"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                <input type="datetime-local" value={fDate} onChange={e => setFDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700" />
              </div>
              <input value={fLoc} onChange={e => setFLoc(e.target.value)} placeholder="Last seen — street / park / area *"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={2}
                placeholder="Anything helpful: collar, microchip, shy or friendly, favorite treats…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="Contact phone"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                <input value={fReward} onChange={e => setFReward(e.target.value)} placeholder="Reward (optional)"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="Contact email"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button onClick={submitAlert} disabled={saving}
                className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#dc2626' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                🚨 Send out the SOS
              </button>
            </div>
          )}

          {/* Alerts */}
          {loading ? (
            <div className="bg-white rounded-2xl p-6 text-center">
              <Loader2 size={18} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : shown.length === 0 && !dbMissing ? (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-10 text-center">
              <span className="text-4xl block mb-3">{tab === 'missing' ? '🐾' : '🎉'}</span>
              <p className="text-sm font-semibold text-gray-700">
                {tab === 'missing' ? 'No lost pets right now' : 'No reunions yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {tab === 'missing'
                  ? 'Wonderful news — every pet is home safe.'
                  : 'When a missing pet comes home, they show up here.'}
              </p>
            </div>
          ) : (
            shown.map(a => {
              const count = searchers[a.id] ?? 0
              const isMine = userId === a.user_id
              const hasJoined = joined.has(a.id)
              return (
                <div key={a.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${a.status === 'found' ? 'opacity-90' : ''}`}>
                  {/* Photo + status strip */}
                  <div className="flex">
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{SPECIES_EMOJI[a.species] ?? '🐾'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-bold text-gray-900 text-sm truncate">{a.name}</p>
                        {a.status === 'found' ? (
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <PartyPopper size={9} /> Home!
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">MISSING</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {[SPECIES_EMOJI[a.species], a.breed, a.color].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin size={10} className="flex-shrink-0" /> {a.last_seen_location} · {timeAgo(a.last_seen_at)}
                      </p>
                      {a.reward && (
                        <p className="text-[11px] font-semibold text-amber-600 mt-0.5">🎁 {a.reward}</p>
                      )}
                    </div>
                  </div>

                  {a.description && (
                    <p className="text-xs text-gray-600 px-3 pb-2 leading-relaxed">{a.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-3 pb-3">
                    {a.status === 'missing' && (
                      <>
                        <button
                          onClick={() => toggleJoin(a)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            hasJoined ? 'bg-green-50 text-green-700 border border-green-200' : 'text-white'
                          }`}
                          style={hasJoined ? {} : { backgroundColor: '#dc2626' }}
                        >
                          {hasJoined ? <><Check size={12} /> Searching ({count})</> : <><Users size={12} /> Join the search{count > 0 ? ` (${count})` : ''}</>}
                        </button>
                        {a.contact_phone && (
                          <a href={`tel:${a.contact_phone}`}
                            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500">
                            <Phone size={13} />
                          </a>
                        )}
                        {a.contact_email && (
                          <a href={`mailto:${a.contact_email}?subject=Sighting of ${encodeURIComponent(a.name)}`}
                            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500">
                            <Mail size={13} />
                          </a>
                        )}
                      </>
                    )}
                    {a.status === 'found' && count > 0 && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Users size={11} /> {count} {count === 1 ? 'person' : 'people'} helped search 💛
                      </p>
                    )}
                    {isMine && a.status === 'missing' && (
                      <button onClick={() => markFound(a)}
                        className="text-[11px] font-semibold text-green-600 border border-green-200 px-2.5 py-2 rounded-xl hover:bg-green-50 whitespace-nowrap">
                        🎉 Found!
                      </button>
                    )}
                    {isMine && (
                      <button onClick={() => removeAlert(a)}
                        className="text-[11px] text-gray-400 px-1.5 py-2 hover:text-red-500">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
