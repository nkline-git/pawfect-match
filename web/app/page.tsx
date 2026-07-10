'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bookmark, User, X, RotateCcw, Heart,
  MapPin, ExternalLink, SlidersHorizontal,
  ChevronDown, Globe, ChevronLeft, ChevronRight, Pencil, Search,
} from 'lucide-react'
import { usePets, useSavedPets } from '@/hooks/usePets'
import { useProfile } from '@/hooks/useProfile'
import BottomNav from '@/components/ui/BottomNav'
import type { PetSpecies, PetPreferences, Pet, SavedRGAnimal } from '@/types'
import { RG_SAVED_KEY, RG_SEEN_KEY } from '@/types'

// ── Unified animal shape (local DB pets + RescueGroups animals) ──────
interface UnifiedPet {
  id: string
  name: string
  type: string
  breed: string | null
  age: string | null
  gender: string
  size: string | null
  description: string | null
  photo: string | null
  photos: string[]
  url: string           // RescueGroups listing URL (for RG pets) or /pets/:id (local)
  orgUrl: string | null   // rescue's own website (if known)
  orgEmail: string | null // rescue contact email (if known)
  orgPhone: string | null // rescue contact phone (if known)
  city: string
  orgName: string
  tags: string[]
  isLocal: boolean
  distance?: number | null  // miles from search location (RG animals only)
  rescueLat?: number | null // local pets: rescue coords for distance filtering
  rescueLon?: number | null
}

// Haversine distance in miles (client-side, for local pet filtering)
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Helpers ───────────────────────────────────────────────────────────
function applyPreferences(pets: Pet[], prefs: PetPreferences | null): Pet[] {
  if (!prefs) return pets
  return pets.filter(p => {
    if (prefs.species.length > 0 && !prefs.species.includes(p.species)) return false
    // Breed: case-insensitive partial match (e.g. "Poodle" matches "Poodle Mix")
    if (prefs.breeds && prefs.breeds.length > 0 && p.breed) {
      const breedLower = p.breed.toLowerCase()
      if (!prefs.breeds.some(b => breedLower.includes(b.toLowerCase()) || b.toLowerCase().includes(breedLower))) return false
    }
    if (prefs.size.length > 0 && p.size && !prefs.size.includes(p.size)) return false
    if (prefs.energy.length > 0 && p.energy && !prefs.energy.includes(p.energy)) return false
    if (prefs.good_with_kids === true && !p.good_with.includes('Kids')) return false
    if (prefs.good_with_dogs === true && !p.good_with.includes('Dogs')) return false
    if (prefs.good_with_cats === true && !p.good_with.includes('Cats')) return false
    return true
  })
}

function localPetToUnified(pet: Pet): UnifiedPet {
  // Surface good_with as personality tags so cards + match reasons pick them up
  const goodWithTags: string[] = []
  if (pet.good_with.includes('Kids')) goodWithTags.push('Good with kids')
  if (pet.good_with.includes('Dogs')) goodWithTags.push('Dog-friendly')
  if (pet.good_with.includes('Cats')) goodWithTags.push('Cat-friendly')
  const mergedTags = [...pet.traits, ...goodWithTags.filter(t => !pet.traits.includes(t))]
  return {
    id:          pet.id,
    name:        pet.name,
    type:        pet.species,
    breed:       pet.breed,
    age:         pet.age,
    gender:      pet.gender,
    size:        pet.size,
    description: pet.description,
    photo:       pet.photos[0] ?? null,
    photos:      pet.photos ?? [],
    url:         `/pets/${pet.id}`,
    orgUrl:      null,
    orgEmail:    null,
    orgPhone:    null,
    city:        pet.rescue?.city ?? 'Nearby',
    orgName:     pet.rescue?.name ?? 'Local Rescue',
    tags:        mergedTags,
    isLocal:     true,
    rescueLat:   pet.rescue?.lat ?? null,
    rescueLon:   pet.rescue?.lon ?? null,
  }
}

// Shorten breed strings: "Domestic Short Hair / Mixed (short coat)" → "Domestic Short Hair"
// Also trims RG compound breeds like "Parakeet - Other" → "Parakeet"
function shortBreed(breed: string | null): string | null {
  if (!breed) return null
  return breed.split(/[/(]|\s+-\s+/)[0].trim() || breed
}

// Format raw age strings from RG: "6 Years 1 Month" → "6yr 1mo"
function formatAge(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  const yr  = s.match(/(\d+)\s*year/)?.[1]
  const mo  = s.match(/(\d+)\s*month/)?.[1]
  const wk  = s.match(/(\d+)\s*week/)?.[1]
  if (yr && mo && mo !== '0') return `${yr}yr ${mo}mo`
  if (yr)  return `${yr}yr`
  if (mo)  return `${mo}mo`
  if (wk)  return `${wk}wk`
  return raw
}

// Haptic feedback — silently ignored on unsupported browsers / iOS
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* noop */ }
}

// ── Constants ─────────────────────────────────────────────────────────
const SPECIES_BG: Record<string, string> = {
  dog:           'linear-gradient(135deg,#f5e6d3,#eddccc)',
  cat:           'linear-gradient(135deg,#e8d5f5,#d5c4e8)',
  rabbit:        'linear-gradient(135deg,#d5f0e8,#c4e8d5)',
  bird:          'linear-gradient(135deg,#d5e8f5,#c4d5e8)',
  Dog:           'linear-gradient(135deg,#f5e6d3,#eddccc)',
  Cat:           'linear-gradient(135deg,#e8d5f5,#d5c4e8)',
  Rabbit:        'linear-gradient(135deg,#d5f0e8,#c4e8d5)',
  Bird:          'linear-gradient(135deg,#d5e8f5,#c4d5e8)',
  'Small & Furry':'linear-gradient(135deg,#f5f0d5,#e8e0c4)',
  small_animal:  'linear-gradient(135deg,#f5f0d5,#e8e0c4)',
  reptile:       'linear-gradient(135deg,#e8f5d5,#d5e8c4)',
  farm:          'linear-gradient(135deg,#f0e8d5,#e0d5c4)',
  other:         'linear-gradient(135deg,#f5d5e8,#e8c4d5)',
}

// Species emoji shown when an animal has no photo
const SPECIES_EMOJI: Record<string, string> = {
  Dog: '🐕', dog: '🐕',
  Cat: '🐱', cat: '🐱',
  Rabbit: '🐰', rabbit: '🐰',
  Bird: '🦜', bird: '🦜',
  'Small & Furry': '🐹', small_animal: '🐹',
}

// Map RG species tab → local DB species values for filtering
const RG_TO_LOCAL: Record<string, PetSpecies[]> = {
  'Dog':           ['dog'],
  'Cat':           ['cat'],
  'Rabbit':        ['rabbit'],
  'Bird':          ['bird'],
  'Small & Furry': ['small_animal'],
}

const SPECIES_TABS = [
  { label: 'All',    value: '',       icon: '🐾' },
  { label: 'Dogs',   value: 'Dog',    icon: '🐕' },
  { label: 'Cats',   value: 'Cat',    icon: '🐱' },
  { label: 'Rabbits',value: 'Rabbit', icon: '🐰' },
  { label: 'Birds',  value: 'Bird',   icon: '🦜' },
]

// ── Match reason builder ──────────────────────────────────────────────
function matchReasons(pet: UnifiedPet, prefs: PetPreferences | null): string[] {
  if (!prefs) return []
  const reasons: string[] = []
  const tags = new Set(pet.tags)

  // Species
  const speciesMatch = prefs.species.length > 0 && prefs.species.some(s =>
    pet.type.toLowerCase().startsWith(s.toLowerCase().replace('_', ''))
  )
  if (speciesMatch) {
    const emoji = { dog: '🐕', cat: '🐱', rabbit: '🐰', bird: '🦜', small_animal: '🐹' }
    const key = prefs.species.find(s => pet.type.toLowerCase().startsWith(s.toLowerCase().replace('_', ''))) ?? ''
    reasons.push(`${emoji[key as keyof typeof emoji] ?? '🐾'} Your favorite species`)
  }

  // Size
  if (prefs.size.length > 0 && pet.size && prefs.size.includes(pet.size))
    reasons.push(`📏 ${pet.size} size — your pick`)

  // Age group
  if (prefs.age && prefs.age.length > 0) {
    if (prefs.age.includes('Young')  && tags.has('Young'))  reasons.push('🐣 Young — just what you wanted')
    if (prefs.age.includes('Senior') && tags.has('Senior')) reasons.push('🧓 Senior — loves the calm life')
    if (prefs.age.includes('Adult')  && !tags.has('Young') && !tags.has('Senior'))
      reasons.push('🦮 Adult — ready for a home')
  }

  // Compatibility
  if (prefs.good_with_kids === true && tags.has('Good with kids')) reasons.push('👧 Great with kids')
  if (prefs.good_with_dogs === true && tags.has('Dog-friendly'))   reasons.push('🐕 Dog-friendly')
  if (prefs.good_with_cats === true && tags.has('Cat-friendly'))   reasons.push('🐱 Cat-friendly')

  // Housing
  if (prefs.housing === 'apartment' && tags.has('Apartment OK'))   reasons.push('🏢 Apartment-friendly')

  return reasons
}

// ── Detail modal ─────────────────────────────────────────────────────
function AnimalDetailSheet({
  animal,
  onClose,
  initialPhotos,
  prefs,
}: {
  animal: UnifiedPet
  onClose: () => void
  initialPhotos?: string[]
  prefs?: PetPreferences | null
}) {
  const [photoIdx,      setPhotoIdx]      = useState(0)
  const [extraPhotos,   setExtraPhotos]   = useState<string[]>(initialPhotos ?? [])
  const [photosLoading, setPhotosLoading] = useState(false)

  // Lazy-load photos only if not already cached from the card prefetch
  useEffect(() => {
    if (animal.isLocal || (initialPhotos && initialPhotos.length > 0)) return
    setPhotosLoading(true)
    fetch(`/api/rescuegroups/animal/${animal.id}`)
      .then(r => r.json())
      .then((data: { photos?: string[] }) => {
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          setExtraPhotos(data.photos)
        }
      })
      .catch(() => {})
      .finally(() => setPhotosLoading(false))
  }, [animal.id, animal.isLocal, initialPhotos])

  // Gallery: use lazy-loaded extras if available, else fall back to existing data
  const basePhotos = animal.photos.length > 0
    ? animal.photos
    : animal.photo ? [animal.photo] : []
  const photos = extraPhotos.length > 0 ? extraPhotos : basePhotos
  // Keep current photo index in bounds when photos arrive
  const safeIdx = Math.min(photoIdx, Math.max(0, photos.length - 1))

  const bg = SPECIES_BG[animal.type] ?? SPECIES_BG.other

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Photo gallery */}
        <div className="relative h-60 flex items-center justify-center" style={{ background: bg }}>
          {photos.length > 0 ? (
            <img src={photos[safeIdx]} alt={animal.name} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-[90px]">🐾</span>
          )}

          {/* Photos loading spinner — shows while we're fetching all photos */}
          {photosLoading && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
              <span className="text-white text-[10px] animate-pulse">📷 loading photos…</span>
            </div>
          )}

          {/* Prev / next arrows */}
          {photos.length > 1 && safeIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.max(0, i - 1)) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {photos.length > 1 && safeIdx < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.min(photos.length - 1, i + 1)) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Photo dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setPhotoIdx(i) }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ backgroundColor: i === safeIdx ? 'white' : 'rgba(255,255,255,0.45)' }}
                />
              ))}
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
          >
            <X size={16} />
          </button>
          {/* Drag handle */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60" />
          {/* Source badge */}
          {!animal.isLocal && (
            <div className="absolute top-4 left-4 z-10">
              <span className="flex items-center gap-1 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#3b82f6' }}>
                <Globe size={9} /> RescueGroups
              </span>
            </div>
          )}
          {animal.isLocal && (
            <div className="absolute top-4 left-4 z-10">
              <span className="flex items-center gap-1 bg-white/80 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                🐾 Local rescue
              </span>
            </div>
          )}

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="text-white/80 text-[10px] font-semibold bg-black/30 px-2 py-0.5 rounded-full">
                {safeIdx + 1} / {photos.length}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 240px)' }}>
          <div className="px-5 pt-4 pb-8">
            {/* Name + age */}
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{animal.name}</h2>
              {animal.age && <span className="text-gray-400 text-sm">{formatAge(animal.age)}</span>}
            </div>

            {/* Meta row */}
            <p className="text-sm text-gray-500 mb-3">
              {[shortBreed(animal.breed), animal.gender, animal.size].filter(Boolean).join(' · ')}
            </p>

            {/* Org + location + distance */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
              <MapPin size={13} className="text-gray-400 flex-shrink-0" />
              <span>{animal.orgName}</span>
              {animal.city && <span className="text-gray-400">· {animal.city}</span>}
              {typeof animal.distance === 'number' && (
                <span className="text-gray-400">· {animal.distance < 1 ? '<1' : animal.distance} mi</span>
              )}
            </div>

            {/* "Why we recommend" banner — only shown when user has preferences that match */}
            {(() => {
              const reasons = matchReasons(animal, prefs ?? null)
              if (reasons.length === 0) return null
              return (
                <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                      ✨ Why {animal.name} is a great match for you
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {reasons.map(r => (
                        <span key={r} className="text-[11px] font-medium text-green-800 bg-white/70 px-2.5 py-1 rounded-full">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Tags — skip Male/Female since gender is already in the subtitle */}
            {animal.tags.filter(t => t !== 'Male' && t !== 'Female').length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {animal.tags.filter(t => t !== 'Male' && t !== 'Female').map(t => (
                  <span key={t} className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {animal.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{animal.description}</p>
            )}

            {/* CTA */}
            {animal.isLocal ? (
              <a
                href={animal.url}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold shadow"
                style={{ backgroundColor: '#e05a4e' }}
              >
                Full profile &amp; apply
                <ExternalLink size={14} />
              </a>
            ) : (
              <div className="flex flex-col gap-2">
                {animal.orgUrl ? (
                  <a
                    href={animal.orgUrl.startsWith('http') ? animal.orgUrl : `https://${animal.orgUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold shadow"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    Visit {animal.orgName}&apos;s website
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <div className="text-center py-3 px-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-gray-600 font-medium">{animal.orgName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{animal.city} · Contact them to inquire about {animal.name}</p>
                  </div>
                )}
                {animal.orgEmail && (
                  <a
                    href={`mailto:${animal.orgEmail}?subject=Inquiry about ${encodeURIComponent(animal.name)}&body=Hi! I saw ${encodeURIComponent(animal.name)} on Pawfect Match and I'm interested in adoption. Could you tell me more?`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm border-2"
                    style={{ borderColor: '#e05a4e', color: '#e05a4e' }}
                  >
                    ✉️ Email {animal.orgName}
                  </a>
                )}
                {animal.orgPhone && (
                  <a
                    href={`tel:${animal.orgPhone}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm border border-gray-200 text-gray-600"
                  >
                    📞 {animal.orgPhone}
                  </a>
                )}
                {/* Web Share API — available in mobile browsers */}
                <button
                  onClick={async () => {
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: `${animal.name} needs a home!`,
                          text: `Meet ${animal.name} — a ${animal.breed ?? animal.type} from ${animal.orgName} looking for their forever home. Found on Pawfect Match!`,
                          url: animal.orgUrl ?? animal.url,
                        })
                      }
                    } catch { /* user cancelled or not supported */ }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm border border-gray-200 text-gray-500"
                >
                  📤 Share {animal.name}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tag color mapping: each tag gets a distinct bg + text color pair
const TAG_COLORS: Record<string, string> = {
  'Female':        'bg-rose-50 text-rose-600',
  'Male':          'bg-sky-50 text-sky-600',
  'Young':         'bg-emerald-50 text-emerald-600',
  'Senior':        'bg-amber-50 text-amber-600',
  'House-trained': 'bg-green-50 text-green-700',
  'Good with kids':'bg-yellow-50 text-yellow-700',
  'Dog-friendly':  'bg-blue-50 text-blue-600',
  'Cat-friendly':  'bg-violet-50 text-violet-600',
  'Indoor':        'bg-indigo-50 text-indigo-600',
  'Playful':       'bg-orange-50 text-orange-600',
  'Cuddly':        'bg-pink-50 text-pink-600',
  'Calm':          'bg-teal-50 text-teal-600',
  'Fixed':         'bg-cyan-50 text-cyan-600',
  'Vaccinated':    'bg-lime-50 text-lime-700',
  'Leash-trained': 'bg-green-50 text-green-600',
  'Crate-trained': 'bg-stone-50 text-stone-600',
  'Apartment OK':  'bg-purple-50 text-purple-600',
}

// ── Main page ─────────────────────────────────────────────────────────
export default function BrowsePage() {
  const [speciesFilter,    setSpeciesFilter]    = useState('')
  const [prefActive,       setPrefActive]       = useState(false)
  const [animals,          setAnimals]          = useState<UnifiedPet[]>([])
  const [rgLoading,        setRgLoading]        = useState(false)
  const [rgFailed,         setRgFailed]         = useState(false)
  const [retryTick,        setRetryTick]        = useState(0)
  const [idx,              setIdx]              = useState(0)
  const [selected,         setSelected]         = useState<UnifiedPet | null>(null)
  const [matchedPet,       setMatchedPet]       = useState<UnifiedPet | null>(null)
  // Expand-radius state — when user exhausts all visible pets, offer to widen search
  const [hasExpanded,      setHasExpanded]      = useState(false)
  const [expandLoading,    setExpandLoading]    = useState(false)
  const [expandedToRadius, setExpandedToRadius] = useState<number | null>(null)

  // Card photo cycling — fetches all photos per animal and lets the user tap to cycle
  const [cardPhotoIdx,      setCardPhotoIdx]      = useState(0)
  const [cardPhotosCache,   setCardPhotosCache]   = useState<Record<string, string[]>>({})
  const [cardPhotosLoading, setCardPhotosLoading] = useState<Set<string>>(new Set())
  const touchMovedRef = useRef(false)

  // Persistent set of seen (liked + passed) animal IDs — prevents repeats across sessions
  const seenIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RG_SEEN_KEY)
      if (stored) seenIdsRef.current = new Set(JSON.parse(stored) as string[])
    } catch { /* noop */ }
  }, [])
  const markSeen = (id: string) => {
    seenIdsRef.current.add(id)
    try {
      const arr = Array.from(seenIdsRef.current).slice(-5000)
      localStorage.setItem(RG_SEEN_KEY, JSON.stringify(arr))
    } catch { /* noop */ }
  }

  // Location state — persisted in localStorage for guests
  const [guestCity,    setGuestCity]    = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pawfect_city') ?? ''
    return ''
  })
  const [showLocInput, setShowLocInput] = useState(false)
  const [locInputVal,  setLocInputVal]  = useState('')

  // First-visit swipe hint (dismissed after any interaction)
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    if (typeof window !== 'undefined') return !localStorage.getItem('pawfect_interacted')
    return false
  })
  const dismissHint = () => {
    if (!showSwipeHint) return
    setShowSwipeHint(false)
    try { localStorage.setItem('pawfect_interacted', '1') } catch { /* noop */ }
  }

  // Card photo shimmer + error state
  const [imgLoaded,    setImgLoaded]    = useState(false)
  const [cardImgError, setCardImgError] = useState(false)
  const cardImgRef = useRef<HTMLImageElement>(null)

  // Like-celebration floating hearts
  const [likeHearts, setLikeHearts] = useState<{ id: number; x: number }[]>([])
  const heartIdRef = useRef(0)
  const spawnHearts = () => {
    const hearts = Array.from({ length: 5 }, () => ({
      id: ++heartIdRef.current,
      x: 20 + Math.random() * 60,
    }))
    setLikeHearts(h => [...h, ...hearts])
    setTimeout(() => setLikeHearts(h => h.filter(x => !hearts.some(hh => hh.id === x.id))), 800)
  }

  // Swipe state
  const [swipeDx,  setSwipeDx]  = useState(0)
  const touchStartX = useRef(0)
  const isExiting = Math.abs(swipeDx) >= 400

  const { pets, loading: localLoading }  = usePets()
  const { savedIds, toggleSave }         = useSavedPets()
  const { profile, loading: profileLoading } = useProfile()

  const prefs  = profile?.preferences ?? null
  const radius = profile?.notification_prefs?.search_radius ?? 100

  // Track whether the user set a manual city THIS session — only then does it
  // beat their profile city. A stale localStorage city (e.g. written weeks ago
  // or by the shop page) must never silently override a logged-in profile.
  const sessionCityRef = useRef(false)

  // Effective search location:
  //   Logged-in: this-session manual override > profile city > stale localStorage > fallback
  //   Guest:     manual/localStorage city > fallback
  const searchCity = profile?.city
    ? (sessionCityRef.current && guestCity ? guestCity : profile.city)
    : (guestCity || 'Wichita, KS')

  // Radius priority:
  //   1. Logged-in user → always use their profile slider (even if guestCity is set)
  //   2. Guest with a typed city → 500 mi
  //   3. Complete guest with no city → US-wide 2000 mi
  const searchRadius = profile
    ? radius               // profile slider value is always respected for logged-in users
    : guestCity
      ? 500                // guest manually typed a city
      : 2000               // no location at all — show everything

  const saveGuestCity = (city: string) => {
    const trimmed = city.trim()
    sessionCityRef.current = true   // user explicitly set this — beats profile city
    setGuestCity(trimmed)
    if (typeof window !== 'undefined') {
      if (trimmed) localStorage.setItem('pawfect_city', trimmed)
      else localStorage.removeItem('pawfect_city')
    }
    setShowLocInput(false)
  }

  // Auto-use geolocation silently if permission was already granted (no prompt needed)
  useEffect(() => {
    if (guestCity || profile?.city) return  // already have a location
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(p => {
      if (p.state === 'granted') requestGeolocation()
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track RG pagination so we can load more as the user swipes
  const [rgOffset,       setRgOffset]       = useState(0)
  const [rgTotal,        setRgTotal]        = useState(0)
  const [loadMoreActive, setLoadMoreActive] = useState(false)
  const loadMoreRef = useRef(false)  // guard against concurrent fetches

  // ── Expand-radius search ─────────────────────────────────────────
  const expandSearch = async () => {
    const newRadius = Math.min(searchRadius + 100, 2000)
    setExpandLoading(true)
    try {
      const p = new URLSearchParams({
        location: searchCity,
        limit:    '50',
        radius:   String(newRadius),
      })
      if (speciesFilter) p.set('type', speciesFilter)

      const res  = await fetch(`/api/rescuegroups?${p}`)
      const data = await res.json()

      if (!data.error) {
        const existingIds = new Set(animals.map(a => a.id))
        const newPets = (data.animals ?? [])
          .filter((a: UnifiedPet) => !existingIds.has(a.id))
          .map((a: UnifiedPet) => ({
            ...a,
            photos:   Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
            orgUrl:   a.orgUrl   ?? null,
            orgEmail: a.orgEmail ?? null,
            orgPhone: a.orgPhone ?? null,
            isLocal:  false,
          }))
        setAnimals(prev => [...prev, ...newPets])
        if (data.pagination) {
          setRgOffset(data.pagination.offset + (data.animals?.length ?? 0))
          setRgTotal(data.pagination.total ?? 0)
        }
      }
      setExpandedToRadius(newRadius)
      setHasExpanded(true)
    } catch {
      setHasExpanded(true)
    }
    setExpandLoading(false)
  }

  // ── Load more RG animals (same search, next page) ────────────────
  const loadMoreRG = async (currentAnimals: UnifiedPet[], offset: number) => {
    if (loadMoreRef.current) return
    loadMoreRef.current = true
    setLoadMoreActive(true)
    try {
      const p = new URLSearchParams({
        location: searchCity,
        limit:    '50',
        offset:   String(offset),
        radius:   String(searchRadius),
      })
      if (speciesFilter) p.set('type', speciesFilter)

      const res  = await fetch(`/api/rescuegroups?${p}`)
      const data = await res.json()

      if (!data.error && Array.isArray(data.animals) && data.animals.length > 0) {
        const existingIds = new Set(currentAnimals.map(a => a.id))
        const newPets = data.animals
          .filter((a: UnifiedPet) => !existingIds.has(a.id) && !seenIdsRef.current.has(String(a.id)))
          .map((a: UnifiedPet) => ({
            ...a,
            photos:   Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
            orgUrl:   a.orgUrl   ?? null,
            orgEmail: a.orgEmail ?? null,
            orgPhone: a.orgPhone ?? null,
            isLocal:  false,
          }))
        setAnimals(prev => [...prev, ...newPets])
        setRgOffset(offset + data.animals.length)
        setRgTotal(data.pagination?.total ?? rgTotal)
      }
    } catch { /* silently skip */ }
    setLoadMoreActive(false)
    loadMoreRef.current = false
  }

  // ── Build unified animal list ─────────────────────────────────────
  useEffect(() => {
    // Wait for the profile before the first fetch — otherwise we'd search the
    // fallback city and briefly show far-away animals to logged-in users
    if (profileLoading) return

    // Filter & convert local DB pets
    const localSpecies = speciesFilter ? (RG_TO_LOCAL[speciesFilter] ?? []) : []
    const baseLocal = speciesFilter
      ? pets.filter(p => localSpecies.includes(p.species))
      : pets

    const filteredLocal = prefActive && prefs
      ? applyPreferences(baseLocal, prefs)
      : baseLocal

    const localUnified = filteredLocal.map(localPetToUnified)

    // Reset expand state + pagination on fresh searches
    setHasExpanded(false)
    setExpandedToRadius(null)
    setRgOffset(0)
    setRgTotal(0)
    loadMoreRef.current = false

    // Fetch RescueGroups using the effective search city/radius — initial 50 animals
    setRgLoading(true)
    setRgFailed(false)
    const params = new URLSearchParams({
      location: searchCity,
      limit:    '50',
      radius:   String(searchRadius),
    })
    if (speciesFilter) params.set('type', speciesFilter)

    const ac = new AbortController()
    fetch(`/api/rescuegroups?${params}`, { signal: ac.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { animals?: UnifiedPet[]; setup?: boolean; searchCoords?: { lat: number; lon: number }; pagination?: { countReturned: number; total: number; offset: number } }) => {
        // Distance-filter local pets against the same search origin the API
        // used — a rescue in Kansas shouldn't show for a San Diego user.
        // Pets whose rescue has no coords are kept (fail open).
        const nearbyLocal = data.searchCoords
          ? localUnified.filter(p =>
              p.rescueLat == null || p.rescueLon == null ||
              haversineMiles(data.searchCoords!.lat, data.searchCoords!.lon, p.rescueLat, p.rescueLon) <= searchRadius
            )
          : localUnified

        if (data.setup) {
          setAnimals(nearbyLocal)
        } else {
          const rgPets = (data.animals ?? [])
            .filter((a: UnifiedPet) => !seenIdsRef.current.has(String(a.id)))
            .map((a: UnifiedPet) => ({
              ...a,
              photos:    Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
              orgUrl:    a.orgUrl    ?? null,
              orgEmail:  a.orgEmail  ?? null,
              orgPhone:  a.orgPhone  ?? null,
              isLocal:   false,
            }))
          setAnimals([...nearbyLocal, ...rgPets])
          if (data.pagination) {
            setRgOffset(data.pagination.offset + rgPets.length)
            setRgTotal(data.pagination.total)
          }
        }
        setIdx(0)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setAnimals(localUnified)
          setIdx(0)
          setRgFailed(true)
        }
      })
      .finally(() => { if (!ac.signal.aborted) setRgLoading(false) })
    return () => ac.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, speciesFilter, prefActive, searchCity, searchRadius, retryTick, profileLoading])

  // ── Auto-load more when queue is getting low (< 15 animals left) ─
  useEffect(() => {
    const remaining = animals.length - idx
    if (remaining < 15 && !loadMoreRef.current && !loadMoreActive && rgOffset > 0 && rgOffset < rgTotal) {
      loadMoreRG(animals, rgOffset)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, animals.length, rgOffset, rgTotal, loadMoreActive])

  const isLoading = localLoading || rgLoading || profileLoading
  const pet = animals[idx] ?? null

  // ── Card photo fetching ───────────────────────────────────────────
  // Whenever the active card changes, reset the photo index and pre-fetch
  // all photos for RG animals (active + next 7) so tapping cycles through them.
  useEffect(() => {
    setCardPhotoIdx(0)

    // Pre-fetch photos for the current card + next 7 cards
    const toFetch = animals.slice(idx, idx + 8).filter(a => !a.isLocal && !cardPhotosCache[a.id])
    if (toFetch.length === 0) return

    // Mark all as loading before any fetch starts
    setCardPhotosLoading(prev => {
      const s = new Set(prev)
      for (const a of toFetch) s.add(a.id)
      return s
    })

    for (const a of toFetch) {
      fetch(`/api/rescuegroups/animal/${a.id}`)
        .then(r => r.json())
        .then((data: { photos?: string[] }) => {
          if (Array.isArray(data.photos) && data.photos.length > 0) {
            setCardPhotosCache(prev => ({ ...prev, [a.id]: data.photos! }))
          }
        })
        .catch(() => {})
        .finally(() => {
          setCardPhotosLoading(prev => { const s = new Set(prev); s.delete(a.id); return s })
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet?.id])

  // Photos available on the current card (fetched set, or existing single thumbnail)
  const cardPhotos: string[] = pet
    ? pet.isLocal
      ? (pet.photos.length > 0 ? pet.photos : (pet.photo ? [pet.photo] : []))
      : (cardPhotosCache[pet.id] ?? (pet.photos.length > 0 ? pet.photos : (pet.photo ? [pet.photo] : [])))
    : []
  const safeCardIdx      = Math.min(cardPhotoIdx, Math.max(0, cardPhotos.length - 1))
  const currentCardPhoto = cardPhotos[safeCardIdx] ?? null

  // True when we have no photo yet but the individual-endpoint fetch is still in-flight.
  // Shows a shimmer instead of the fallback emoji, then reveals the photo when it lands.
  const isPhotoFetching = !!pet && !pet.isLocal
    && !currentCardPhoto && cardPhotosLoading.has(pet.id)

  // ── Actions ───────────────────────────────────────────────────────
  // doPass / doLike = pure state mutations (no animation); called after card flies out
  const doPass = () => {
    dismissHint()
    if (pet && !pet.isLocal) markSeen(pet.id)
    setIdx(i => Math.min(i + 1, animals.length))
  }
  const doLike = () => {
    if (!pet) return
    dismissHint()
    if (!pet.isLocal) markSeen(pet.id)
    spawnHearts()
    if (pet.isLocal) {
      toggleSave(pet.id)
    } else {
      try {
        const existing: SavedRGAnimal[] = JSON.parse(localStorage.getItem(RG_SAVED_KEY) ?? '[]')
        if (!existing.some(a => a.id === pet.id)) {
          const entry: SavedRGAnimal = {
            id: pet.id, name: pet.name, type: pet.type, breed: pet.breed,
            age: pet.age, gender: pet.gender,
            // Prefer the fetched gallery photo for higher quality on the Saved page
            photo: cardPhotosCache[pet.id]?.[0] ?? pet.photo,
            orgName: pet.orgName,
            orgUrl: pet.orgUrl, orgEmail: pet.orgEmail, orgPhone: pet.orgPhone,
            city: pet.city, savedAt: new Date().toISOString(),
          }
          localStorage.setItem(RG_SAVED_KEY, JSON.stringify([entry, ...existing]))
        }
      } catch { /* localStorage unavailable */ }
    }
    setMatchedPet(pet)
    setIdx(i => Math.min(i + 1, animals.length))
  }

  // handlePass / handleLike = animated versions used by buttons and keyboard
  const handlePass = () => {
    if (!pet) return
    vibrate([5, 5])
    setSwipeDx(-420)
    setTimeout(() => { doPass(); setSwipeDx(0) }, 140)
  }
  const handleLike = () => {
    if (!pet) return
    vibrate(20)
    setSwipeDx(420)
    setTimeout(() => { doLike(); setSwipeDx(0) }, 140)
  }
  const handleUndo = () => setIdx(i => Math.max(i - 1, 0))

  // ── Geolocation ───────────────────────────────────────────────────
  const requestGeolocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
          { headers: { 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app)' } }
        )
        const d = await r.json()
        const city  = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.county
        const state = d.address?.state_code ?? d.address?.state
        if (city) saveGuestCity(state ? `${city}, ${state}` : city)
      } catch { /* noop */ }
    }, () => { /* user denied */ })
  }

  // ── Swipe ─────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 80
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchMovedRef.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    setSwipeDx(dx)
    if (Math.abs(dx) > 10) touchMovedRef.current = true  // mark as swipe, not tap
  }
  const handleTouchEnd = () => {
    if (swipeDx > SWIPE_THRESHOLD) {
      vibrate(20)
      setSwipeDx(400)
      setTimeout(() => { doLike(); setSwipeDx(0) }, 150)
    } else if (swipeDx < -SWIPE_THRESHOLD) {
      vibrate([5, 5])
      setSwipeDx(-400)
      setTimeout(() => { doPass(); setSwipeDx(0) }, 150)
    } else {
      setSwipeDx(0)
    }
  }

  // Reset shimmer/error state when active photo changes.
  // For cached images onLoad never fires — check complete on next tick after DOM updates.
  useEffect(() => {
    setImgLoaded(false)
    setCardImgError(false)
    const id = setTimeout(() => {
      if (!cardImgRef.current) return
      if (cardImgRef.current.complete && (cardImgRef.current.naturalWidth ?? 0) > 0) {
        setImgLoaded(true)  // cached and loaded
      } else if (cardImgRef.current.complete && (cardImgRef.current.naturalWidth ?? 0) === 0) {
        setImgLoaded(true); setCardImgError(true)  // failed before React mounted
      }
    }, 0)
    return () => clearTimeout(id)
  }, [currentCardPhoto])

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected || matchedPet) return
      if (!pet) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') handlePass()
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleLike()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, matchedPet, pet])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
        <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🐾</span>
              <span className="text-xl font-bold">
                <span style={{ color: '#e05a4e' }}>Pawfect</span>
                <span className="text-gray-900"> Match</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {prefs && (
                <button
                  onClick={() => setPrefActive(v => !v)}
                  title={prefActive ? 'Preferences on' : 'Preferences off'}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                  style={{ backgroundColor: prefActive ? '#fef2f2' : 'transparent', color: '#e05a4e' }}
                >
                  <SlidersHorizontal size={16} />
                  {prefActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#e05a4e' }} />
                  )}
                </button>
              )}
              <a href="/saved" className="text-gray-400 hover:text-gray-600">
                <Bookmark size={20} />
              </a>
              <a href="/profile" className="text-gray-400 hover:text-gray-600">
                <User size={20} />
              </a>
            </div>
          </header>

          {/* Onboarding nudge */}
          {profile && !prefs && (
            <a
              href="/onboarding"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-2 text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#e05a4e,#c44b40)' }}
            >
              <SlidersHorizontal size={15} />
              <span>Customize your feed — set pet preferences</span>
              <span className="ml-auto text-white/70">→</span>
            </a>
          )}

          {/* Location bar — always visible, editable */}
          <div className="px-1 mb-2">
            {showLocInput ? (
              <div className="bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2">
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={locInputVal}
                  onChange={e => setLocInputVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveGuestCity(locInputVal)
                    if (e.key === 'Escape') setShowLocInput(false)
                  }}
                  placeholder="City, State or zip — e.g. Austin, TX or 92101"
                  autoFocus
                  className="flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
                />
                <button
                  onClick={() => requestGeolocation()}
                  title="Use my location"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  📍
                </button>
                <button
                  onClick={() => saveGuestCity(locInputVal)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: '#e05a4e' }}
                >
                  <Search size={13} />
                </button>
                <button onClick={() => setShowLocInput(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => { setLocInputVal(guestCity || profile?.city || ''); setShowLocInput(true) }}
                  className="flex items-center gap-1.5 text-white/70 text-xs hover:text-white/90 transition-colors group"
                >
                  <MapPin size={11} />
                  <span>
                    {searchCity === 'Wichita, KS' && !guestCity && !profile?.city
                      ? 'All locations'
                      : searchCity}
                  </span>
                  {(profile?.city || guestCity) && (
                    <span className="text-white/40">· within {searchRadius} mi</span>
                  )}
                  <Pencil size={10} className="ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
                {!isLoading && rgTotal > 0 && (
                  <span className="ml-2 text-white/40 text-[10px]">
                    {rgTotal.toLocaleString()} pets
                  </span>
                )}
                {!guestCity && !profile?.city && (
                  <button
                    onClick={requestGeolocation}
                    className="ml-2 flex items-center gap-1 text-white/70 text-[10px] hover:text-white/90 transition-colors animate-soft-pulse"
                  >
                    📍 Use my location
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Species filter tabs — right-edge fade hints there are more tabs to scroll */}
          <div className="relative mb-3">
            <div className="flex gap-2 px-1 overflow-x-auto scrollbar-none">
            {SPECIES_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setSpeciesFilter(tab.value); setIdx(0) }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  speciesFilter === tab.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={speciesFilter === tab.value
                  ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' }
                  : {}}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            </div>
            {/* Fade to hint scrollability */}
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, var(--bg, #c4b5a2))' }} />
          </div>

          {/* Card area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Rescue-network error banner — non-blocking, retryable */}
            {rgFailed && !isLoading && (
              <button
                onClick={() => setRetryTick(t => t + 1)}
                className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 text-left"
              >
                <span className="text-base">📡</span>
                <span className="flex-1 text-xs text-amber-800 leading-snug">
                  Couldn&apos;t reach the rescue network — showing local pets only.
                </span>
                <span className="text-xs font-bold text-amber-700 flex-shrink-0">Retry ↻</span>
              </button>
            )}
            {isLoading ? (
              /* Loading skeleton */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col animate-pulse">
                <div className="flex-1 min-h-[160px] bg-gray-100" />
                <div className="px-4 pt-3 pb-4 space-y-2">
                  <div className="h-6 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="flex gap-1.5">
                    <div className="h-6 bg-gray-100 rounded-full w-16" />
                    <div className="h-6 bg-gray-100 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ) : pet ? (
              /* Pet card with card-stack depth effect */
              <div className="flex-1 min-h-0 relative">
                {/* Furthest card peeks from behind */}
                {animals[idx + 2] && (
                  <div
                    className="absolute inset-x-10 top-0 h-16 rounded-t-2xl"
                    style={{ background: SPECIES_BG[animals[idx + 2].type] ?? SPECIES_BG.other, zIndex: 1 }}
                  />
                )}
                {/* Next card peeks from behind */}
                {animals[idx + 1] && (
                  <div
                    className="absolute inset-x-5 top-0 h-16 rounded-t-2xl"
                    style={{ background: SPECIES_BG[animals[idx + 1].type] ?? SPECIES_BG.other, zIndex: 2 }}
                  />
                )}
              <div
                key={pet.id}
                className="absolute inset-0 top-8 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col select-none animate-card-in"
                style={{
                  zIndex: 3,
                  transform:  `translateX(${swipeDx}px) rotate(${swipeDx * 0.04}deg)`,
                  transition: isExiting
                    ? 'transform 0.15s ease-out'
                    : swipeDx === 0
                    ? 'transform 0.25s ease'
                    : 'none',
                  willChange:  'transform',
                  touchAction: 'pan-y',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* LIKE overlay */}
                {swipeDx > 10 && (
                  <div className="absolute inset-0 z-20 flex items-start justify-start p-6 pointer-events-none rounded-2xl"
                    style={{ opacity: Math.min(swipeDx / 100, 1), background: 'rgba(34,197,94,0.15)' }}>
                    <div className="border-4 border-green-500 rounded-lg px-3 py-1 rotate-[-15deg]">
                      <span className="text-green-500 text-2xl font-black tracking-wide">LIKE</span>
                    </div>
                  </div>
                )}
                {/* NOPE overlay */}
                {swipeDx < -10 && (
                  <div className="absolute inset-0 z-20 flex items-start justify-end p-6 pointer-events-none rounded-2xl"
                    style={{ opacity: Math.min(-swipeDx / 100, 1), background: 'rgba(239,68,68,0.15)' }}>
                    <div className="border-4 border-red-500 rounded-lg px-3 py-1 rotate-[15deg]">
                      <span className="text-red-500 text-2xl font-black tracking-wide">NOPE</span>
                    </div>
                  </div>
                )}

                {/* Photo — tap to cycle through all photos */}
                <div
                  className="relative flex items-center justify-center overflow-hidden flex-1 min-h-0"
                  style={{ minHeight: 160, background: SPECIES_BG[pet.type] ?? SPECIES_BG.other, cursor: cardPhotos.length > 1 ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Only cycle on a tap (not after a swipe gesture)
                    if (!touchMovedRef.current && cardPhotos.length > 1) {
                      setCardPhotoIdx(i => (i + 1) % cardPhotos.length)
                    }
                  }}
                >
                  {/* Org badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      {pet.isLocal ? '🏠' : <Globe size={10} />}
                      {pet.orgName}
                    </span>
                  </div>

                  {isPhotoFetching ? (
                    /* Shimmer while individual-endpoint fetch is in-flight */
                    <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  ) : currentCardPhoto && !cardImgError ? (
                    <>
                      {!imgLoaded && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                      )}
                      <img
                        ref={cardImgRef}
                        src={currentCardPhoto}
                        alt={pet.name}
                        className="w-full h-full object-cover object-top"
                        style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
                        onLoad={() => setImgLoaded(true)}
                        onError={() => { setImgLoaded(true); setCardImgError(true) }}
                      />
                    </>
                  ) : (
                    <span className="text-[100px] select-none drop-shadow-sm">
                      {SPECIES_EMOJI[pet.type] ?? '🐾'}
                    </span>
                  )}

                  {/* Photo count badge */}
                  {cardPhotos.length > 1 && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-black/40 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        📷 {cardPhotos.length}
                      </span>
                    </div>
                  )}

                  {/* Photo dots — tap to advance */}
                  {cardPhotos.length > 1 && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {cardPhotos.slice(0, 8).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all"
                          style={{
                            width: i === safeCardIdx ? 14 : 6,
                            height: 6,
                            backgroundColor: i === safeCardIdx ? 'white' : 'rgba(255,255,255,0.45)',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Location + distance */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                      <MapPin size={10} />{pet.city}
                      {typeof pet.distance === 'number' && (
                        <span className="text-gray-400">· {pet.distance < 1 ? '<1' : pet.distance} mi</span>
                      )}
                    </span>
                  </div>

                  {/* First-visit swipe hint — shown once until user interacts */}
                  {showSwipeHint && idx === 0 && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                      <div className="animate-bounce-left flex items-center gap-1.5 bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        <ChevronLeft size={12} /> Pass
                      </div>
                      <div className="animate-bounce-right flex items-center gap-1.5 bg-green-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        Like <ChevronRight size={12} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>
                    {pet.age && <span className="text-gray-400 text-sm">{formatAge(pet.age)}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {[shortBreed(pet.breed), pet.gender, pet.size].filter(Boolean).join(' · ')}
                  </p>
                  {pet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {/* Skip Male/Female — already shown in the subtitle breed line */}
                      {pet.tags.filter(t => t !== 'Male' && t !== 'Female').slice(0, 5).map(t => (
                        <span key={t} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  {pet.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{pet.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-2 relative">
                  {/* Floating like hearts */}
                  {likeHearts.map(h => (
                    <div key={h.id} className="absolute bottom-10 animate-float-up pointer-events-none text-lg"
                      style={{ left: `${h.x}%`, zIndex: 20 }}>
                      ❤️
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <button onClick={handlePass}
                      className="w-12 h-12 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm hover:shadow">
                      <X size={20} />
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={idx === 0}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-50 disabled:hover:bg-white"
                    >
                      <RotateCcw size={16} />
                    </button>
                    {/* Info → open detail modal */}
                    <button
                      onClick={() => setSelected(pet)}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={handleLike}
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm hover:shadow"
                      style={{
                        borderColor: '#e05a4e',
                        color: '#e05a4e',
                        backgroundColor: (pet.isLocal && savedIds.has(pet.id)) ? '#fef2f2' : 'white',
                      }}>
                      <Heart size={20} fill={(pet.isLocal && savedIds.has(pet.id)) ? '#e05a4e' : 'none'} />
                    </button>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 px-2 pb-1">
                    <span>← pass</span>
                    <span>tap ↓ for details</span>
                    <span>like →</span>
                  </div>
                </div>
              </div>
              </div>
            ) : loadMoreActive ? (
              /* Loading more animals — shown while auto-fetching the next page */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
                <div className="relative mb-4">
                  <span className="text-5xl">🐾</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center" style={{ backgroundColor: '#e05a4e' }}>
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <p className="text-base font-semibold text-gray-700 mb-1">Finding more pets…</p>
                <p className="text-sm text-gray-400">Searching rescue networks near you</p>
              </div>
            ) : (
              /* Empty state */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
                <span className="text-6xl mb-4">🐾</span>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {animals.length === 0 && prefActive && prefs
                    ? 'No matches for your preferences'
                    : hasExpanded
                    ? `You've seen all pets within ${expandedToRadius ?? searchRadius} miles!`
                    : "You've seen all the pets near you!"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {!hasExpanded && searchRadius + 100 <= 2000
                    ? `Want to see more? We can search a wider area.`
                    : 'Check back soon — new animals are added daily.'}
                </p>

                <div className="flex flex-col gap-2 w-full">
                  {/* Expand radius — show when not yet expanded and there's room */}
                  {!hasExpanded && searchRadius + 100 <= 2000 && (
                    <button
                      onClick={expandSearch}
                      disabled={expandLoading}
                      className="px-5 py-3 rounded-full text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ backgroundColor: '#e05a4e' }}
                    >
                      {expandLoading
                        ? <><span className="animate-spin">⏳</span> Searching further…</>
                        : `Search within ${Math.min(searchRadius + 100, 2000)} miles →`}
                    </button>
                  )}

                  <button
                    onClick={() => setIdx(0)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold ${!hasExpanded && searchRadius + 100 <= 2000 ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'text-white'}`}
                    style={!hasExpanded && searchRadius + 100 <= 2000 ? {} : { backgroundColor: '#e05a4e' }}
                  >
                    Start over
                  </button>

                  {prefActive && prefs && (
                    <button onClick={() => setPrefActive(false)}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                      Show all pets
                    </button>
                  )}
                  {!profile && (
                    <a href="/login"
                      className="px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 text-center">
                      Sign in to set your location &amp; preferences
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>

      {/* Detail sheet */}
      {selected && (
        <AnimalDetailSheet
          animal={selected}
          onClose={() => setSelected(null)}
          initialPhotos={cardPhotosCache[selected.id]}
          prefs={prefs}
        />
      )}

      {/* ── Match celebration overlay ── */}
      {matchedPet && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
          onClick={() => setMatchedPet(null)}
        >
          <div className="min-h-full flex items-center justify-center px-6 py-6">
          <div
            className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[340px]"
            onClick={e => e.stopPropagation()}
          >
            {/* Pet photo strip — prefer gallery photo if cached, fall back to thumbnail */}
            {(() => {
              const matchPhoto = cardPhotosCache[matchedPet.id]?.[0] ?? matchedPet.photos?.[0] ?? matchedPet.photo
              return matchPhoto ? (
                <div
                  className="h-44 overflow-hidden"
                  style={{ background: SPECIES_BG[matchedPet.type] ?? SPECIES_BG.other }}
                >
                  <img src={matchPhoto} alt={matchedPet.name} className="w-full h-full object-cover" />
                </div>
              ) : null
            })()}

            <div className="px-6 pt-5 pb-6 text-center">
              <div className="flex justify-center items-end gap-1.5 mb-3">
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>❤️</span>
                <span className="text-4xl animate-bounce">🐾</span>
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>❤️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                It&apos;s a match! 🎉
              </h2>
              <p className="text-sm font-medium mb-0.5" style={{ color: '#e05a4e' }}>{matchedPet.name} wants to meet you!</p>
              <p className="text-sm text-gray-400 mb-5">Here&apos;s how to make it official:</p>

              <ol className="text-sm text-gray-600 text-left space-y-3 mb-6">
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >1</span>
                  <span>Check out {matchedPet.name}'s full profile and adoption details</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >2</span>
                  <span>Fill out an adoption application with {matchedPet.orgName}</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >3</span>
                  <span>The rescue reviews your app and reaches out to schedule a meet!</span>
                </li>
              </ol>

              <div className="flex flex-col gap-2">
                {/* Primary CTA */}
                {matchedPet.isLocal ? (
                  <a
                    href={matchedPet.url}
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    View {matchedPet.name}&apos;s profile &amp; apply →
                  </a>
                ) : matchedPet.orgUrl ? (
                  <a
                    href={matchedPet.orgUrl.startsWith('http') ? matchedPet.orgUrl : `https://${matchedPet.orgUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    Visit {matchedPet.orgName}&apos;s website →
                  </a>
                ) : (
                  <div className="py-3 px-4 rounded-xl text-center bg-gray-50 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">{matchedPet.orgName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Contact them to start {matchedPet.name}&apos;s adoption</p>
                  </div>
                )}
                {!matchedPet.isLocal && matchedPet.orgEmail && (
                  <a
                    href={`mailto:${matchedPet.orgEmail}?subject=Adoption inquiry: ${encodeURIComponent(matchedPet.name)}&body=Hi! I found ${encodeURIComponent(matchedPet.name)} on Pawfect Match and would love to adopt them. Could you share more details and send me an application?`}
                    className="block py-3 rounded-xl font-semibold text-sm text-center border-2"
                    style={{ borderColor: '#e05a4e', color: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    ✉️ Email {matchedPet.orgName}
                  </a>
                )}
                {!matchedPet.isLocal && matchedPet.orgPhone && (
                  <a
                    href={`tel:${matchedPet.orgPhone}`}
                    className="block py-3 rounded-xl font-semibold text-sm text-center border border-gray-200 text-gray-600"
                    onClick={() => setMatchedPet(null)}
                  >
                    📞 {matchedPet.orgPhone}
                  </a>
                )}
                <button
                  onClick={() => setMatchedPet(null)}
                  className="py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Keep browsing
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
