'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Phone, Mail, Globe, MapPin,
  Clock, ExternalLink, Loader2, CheckCircle, Search, X,
} from 'lucide-react'
import Link from 'next/link'
import type { Rescue, Pet } from '@/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', bird: '🦜',
  reptile: '🦎', small_animal: '🐹', farm: '🐄', other: '🐾',
}
const SPECIES_BG: Record<string, string> = {
  dog:          'linear-gradient(135deg,#f5e6d3,#eddccc)',
  cat:          'linear-gradient(135deg,#e8d5f5,#d5c4e8)',
  rabbit:       'linear-gradient(135deg,#d5f0e8,#c4e8d5)',
  bird:         'linear-gradient(135deg,#d5e8f5,#c4d5e8)',
  reptile:      'linear-gradient(135deg,#e8f5d5,#d5e8c4)',
  small_animal: 'linear-gradient(135deg,#f5f0d5,#e8e0c4)',
  farm:         'linear-gradient(135deg,#f0e8d5,#e0d5c4)',
  other:        'linear-gradient(135deg,#f5d5e8,#e8c4d5)',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  adoption_event: '🐾 Adoption Event',
  fundraiser:     '💰 Fundraiser',
  volunteer_day:  '🤝 Volunteer Day',
  training:       '🎓 Training',
  meetup:         '☕ Meetup',
  other:          '📅 Event',
}

type RescueEvent = {
  id: string
  title: string
  event_type: string
  location: string | null
  starts_at: string
}

export default function RescuePublicPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string
  const supabase = createClient()

  const [rescue,  setRescue]  = useState<Rescue | null>(null)
  const [pets,    setPets]    = useState<Pet[]>([])
  const [events,  setEvents]  = useState<RescueEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Animal directory: search + filters
  const [petQuery,      setPetQuery]      = useState('')
  const [petSpecies,    setPetSpecies]    = useState('')
  const [petGender,     setPetGender]     = useState('')

  useEffect(() => {
    const load = async () => {
      const [rescueRes, petsRes, eventsRes] = await Promise.all([
        supabase.from('rescues').select('*').eq('id', id).single(),
        supabase.from('pets').select('*').eq('rescue_id', id).eq('status', 'available').order('created_at', { ascending: false }),
        supabase.from('events').select('id, title, event_type, location, starts_at')
          .eq('rescue_id', id)
          .eq('status', 'active')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(5)
          .then(r => r)  // events table may not exist yet
      ])

      setRescue(rescueRes.data)
      setPets((petsRes.data ?? []) as Pet[])
      if (!eventsRes.error) setEvents(eventsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) {
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
        <p className="text-white font-semibold">Rescue not found.</p>
        <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white underline">
          ← Go back
        </button>
      </div>
    )
  }

  // Draft pages (built without an EIN, not yet approved) aren't public
  if (rescue.published === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-5xl">📝</span>
        <p className="text-white font-semibold">This rescue page isn&apos;t published yet.</p>
        <p className="text-white/70 text-sm max-w-[300px]">
          The rescue is still completing verification. Check back soon!
        </p>
        <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white underline">
          ← Go back
        </button>
      </div>
    )
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Back */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-white font-semibold truncate">{rescue.name}</span>
        </div>

        {/* Banner + Identity */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          {/* Banner */}
          <div className="h-28" style={{ background: rescue.banner_gradient }} />

          {/* Logo + name */}
          <div className="px-5 pb-5">
            <div className="flex items-end gap-3 -mt-8 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl border-2 border-white">
                {rescue.logo}
              </div>
              {rescue.verified && (
                <div className="mb-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle size={14} />
                  Verified rescue
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-0.5">{rescue.name}</h1>
            <p className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin size={12} />
              {rescue.city}
            </p>

            {rescue.mission && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{rescue.mission}</p>
            )}

            {/* Animal types */}
            {rescue.animal_types.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {rescue.animal_types.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{pets.length}</p>
                <p className="text-[10px] text-gray-500">Available</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{rescue.stats.placed}</p>
                <p className="text-[10px] text-gray-500">Adopted</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{rescue.stats.apps}</p>
                <p className="text-[10px] text-gray-500">Applications</p>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              {rescue.phone && (
                <a href={`tel:${rescue.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  {rescue.phone}
                </a>
              )}
              {rescue.email && (
                <a href={`mailto:${rescue.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  {rescue.email}
                </a>
              )}
              {rescue.website && (
                <a href={rescue.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1">
                  <Globe size={14} className="text-gray-400 flex-shrink-0" />
                  {rescue.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
              {rescue.hours && (
                <div className="flex items-center gap-2 text-sm text-gray-600 py-1">
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  {rescue.hours}
                </div>
              )}
            </div>

            {/* Adoption requirements */}
            {rescue.requirement_notes && (
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700 mb-1">Adoption requirements</p>
                <p className="text-xs text-amber-600 leading-relaxed">{rescue.requirement_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        {events.length > 0 && (
          <div className="mb-4">
            <h2 className="text-white font-bold text-base mb-2 px-1">Upcoming Events</h2>
            <div className="space-y-2">
              {events.map(ev => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: '#fef2f2' }}
                  >
                    {ev.event_type === 'adoption_event' ? '🐾' :
                     ev.event_type === 'fundraiser'     ? '💰' :
                     ev.event_type === 'volunteer_day'  ? '🤝' :
                     ev.event_type === 'training'       ? '🎓' : '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {fmtDate(ev.starts_at)}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </div>
                  <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Available pets — searchable directory */}
        <div className="mb-6">
          <h2 className="text-white font-bold text-base mb-2 px-1">
            Available Pets {pets.length > 0 && `(${pets.length})`}
          </h2>

          {/* Search + filters (shown when there's anything to search) */}
          {pets.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-2.5">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={petQuery}
                  onChange={e => setPetQuery(e.target.value)}
                  placeholder="Search by name, breed, or age…"
                  className="flex-1 min-w-0 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
                />
                {petQuery && (
                  <button onClick={() => setPetQuery('')} className="text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {/* Species chips — only species this rescue actually has */}
                {[...new Set(pets.map(p => p.species))].map(s => (
                  <button
                    key={s}
                    onClick={() => setPetSpecies(v => v === s ? '' : s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      petSpecies === s ? 'text-white' : 'bg-white/80 text-gray-600'
                    }`}
                    style={petSpecies === s ? { backgroundColor: '#e05a4e' } : {}}
                  >
                    {SPECIES_EMOJI[s] ?? '🐾'} <span className="capitalize">{s.replace('_', ' ')}s</span>
                  </button>
                ))}
                {['Female', 'Male'].map(g => (
                  <button
                    key={g}
                    onClick={() => setPetGender(v => v === g ? '' : g)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      petGender === g ? 'text-white' : 'bg-white/80 text-gray-600'
                    }`}
                    style={petGender === g ? { backgroundColor: '#e05a4e' } : {}}
                  >
                    {g === 'Female' ? '♀' : '♂'} {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const q = petQuery.trim().toLowerCase()
            const shown = pets.filter(p => {
              if (petSpecies && p.species !== petSpecies) return false
              if (petGender && p.gender !== petGender) return false
              if (q && ![p.name, p.breed, p.age, ...(p.traits ?? [])].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
              return true
            })
            if (pets.length === 0) return (
              <div className="bg-white rounded-2xl shadow-sm px-5 py-10 text-center">
                <span className="text-4xl block mb-3">🐾</span>
                <p className="text-sm text-gray-500">No pets available right now.<br />Check back soon!</p>
              </div>
            )
            if (shown.length === 0) return (
              <div className="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm text-gray-500">No pets match your search.</p>
                <button
                  onClick={() => { setPetQuery(''); setPetSpecies(''); setPetGender('') }}
                  className="text-xs font-semibold mt-2 underline" style={{ color: '#e05a4e' }}
                >
                  Clear filters
                </button>
              </div>
            )
            return (
            <div className="grid grid-cols-2 gap-3">
              {shown.map(pet => (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Photo */}
                  <div
                    className="h-28 flex items-center justify-center relative"
                    style={{ background: SPECIES_BG[pet.species] ?? SPECIES_BG.other }}
                  >
                    {pet.photos[0] ? (
                      <img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{SPECIES_EMOJI[pet.species] ?? '🐾'}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="font-bold text-gray-900 text-sm">{pet.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {[pet.breed, pet.age].filter(Boolean).join(' · ') || pet.species}
                    </p>
                    {pet.fee != null ? (
                      <p className="text-[11px] font-medium mt-0.5" style={{ color: '#e05a4e' }}>
                        ${(pet.fee / 100).toFixed(0)} fee
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-emerald-600 mt-0.5">Free</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            )
          })()}
        </div>

      </div>
    </div>
  )
}
