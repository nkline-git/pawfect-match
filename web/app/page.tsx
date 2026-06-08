'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bell, User, X, RotateCcw, Heart,
  MapPin, ExternalLink, SlidersHorizontal,
  ChevronDown, Globe, ChevronLeft, ChevronRight, Pencil, Search,
} from 'lucide-react'
import { usePets, useSavedPets } from '@/hooks/usePets'
import { useProfile } from '@/hooks/useProfile'
import BottomNav from '@/components/ui/BottomNav'
import type { PetSpecies, PetPreferences, Pet } from '@/types'

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
  url: string        // RescueGroups listing URL (for RG pets) or /pets/:id (local)
  orgUrl: string | null  // rescue's own website (if known)
  city: string
  orgName: string
  tags: string[]
  isLocal: boolean
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
    city:        pet.rescue?.city ?? 'Nearby',
    orgName:     pet.rescue?.name ?? 'Local Rescue',
    tags:        pet.traits,
    isLocal:     true,
  }
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

// Map RG species tab → local DB species values for filtering
const RG_TO_LOCAL: Record<string, PetSpecies[]> = {
  'Dog':           ['dog'],
  'Cat':           ['cat'],
  'Rabbit':        ['rabbit'],
  'Bird':          ['bird'],
  'Small & Furry': ['small_animal'],
}

const SPECIES_TABS = [
  { label: 'All',    value: '',              icon: '🐾' },
  { label: 'Dogs',   value: 'Dog',           icon: '🐕' },
  { label: 'Cats',   value: 'Cat',           icon: '🐱' },
  { label: 'Rabbits',value: 'Rabbit',        icon: '🐰' },
  { label: 'Birds',  value: 'Bird',          icon: '🦜' },
  { label: 'Small',  value: 'Small & Furry', icon: '🐹' },
]

// ── Detail modal ─────────────────────────────────────────────────────
function AnimalDetailSheet({
  animal,
  onClose,
}: {
  animal: UnifiedPet
  onClose: () => void
}) {
  const [photoIdx, setPhotoIdx] = useState(0)
  // Build gallery: prefer photos array, fall back to single photo
  const photos = animal.photos && animal.photos.length > 0
    ? animal.photos
    : animal.photo ? [animal.photo] : []
  const bg = SPECIES_BG[animal.type] ?? SPECIES_BG.other
  const isExternal = !animal.url.startsWith('/')

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
            <img src={photos[photoIdx]} alt={animal.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[90px]">🐾</span>
          )}

          {/* Prev / next arrows */}
          {photos.length > 1 && photoIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => i - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {photos.length > 1 && photoIdx < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => i + 1) }}
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
                  style={{ backgroundColor: i === photoIdx ? 'white' : 'rgba(255,255,255,0.45)' }}
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

          {/* Photo counter (top-right when > 1 photo) */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="text-white/80 text-[10px] font-semibold bg-black/30 px-2 py-0.5 rounded-full">
                {photoIdx + 1} / {photos.length}
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
              {animal.age && <span className="text-gray-400 text-sm">{animal.age}</span>}
            </div>

            {/* Meta row */}
            <p className="text-sm text-gray-500 mb-3">
              {[animal.breed, animal.gender, animal.size].filter(Boolean).join(' · ')}
            </p>

            {/* Org + location */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
              <MapPin size={13} className="text-gray-400 flex-shrink-0" />
              <span>{animal.orgName}</span>
              {animal.city && <span className="text-gray-400">· {animal.city}</span>}
            </div>

            {/* Tags */}
            {animal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {animal.tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
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
                {animal.orgUrl && (
                  <a
                    href={animal.orgUrl.startsWith('http') ? animal.orgUrl : `https://${animal.orgUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold shadow"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    Visit {animal.orgName}'s website
                    <ExternalLink size={14} />
                  </a>
                )}
                <a
                  href={animal.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold shadow text-sm ${animal.orgUrl ? 'border border-gray-200 text-gray-700 bg-white' : 'text-white'}`}
                  style={!animal.orgUrl ? { backgroundColor: '#e05a4e' } : {}}
                >
                  View on RescueGroups.org
                  <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function BrowsePage() {
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [prefActive,    setPrefActive]    = useState(false)
  const [animals,       setAnimals]       = useState<UnifiedPet[]>([])
  const [rgLoading,     setRgLoading]     = useState(false)
  const [idx,           setIdx]           = useState(0)
  const [selected,      setSelected]      = useState<UnifiedPet | null>(null)
  const [matchedPet,    setMatchedPet]    = useState<UnifiedPet | null>(null)

  // Location state — persisted in localStorage for guests
  const [guestCity,    setGuestCity]    = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('pawfect_city') ?? ''
    return ''
  })
  const [showLocInput, setShowLocInput] = useState(false)
  const [locInputVal,  setLocInputVal]  = useState('')

  // Swipe state
  const [swipeDx,  setSwipeDx]  = useState(0)
  const touchStartX = useRef(0)
  const isExiting = Math.abs(swipeDx) >= 400

  const { pets, loading: localLoading }  = usePets()
  const { savedIds, toggleSave }         = useSavedPets()
  const { profile, loading: profileLoading } = useProfile()

  const prefs  = profile?.preferences ?? null
  const radius = profile?.notification_prefs?.search_radius ?? 100

  // Effective search location: manual guest city > profile city > US-wide
  const searchCity   = guestCity || profile?.city || 'Wichita, KS'
  const searchRadius = guestCity
    ? 500                    // reasonable radius for a manually typed city
    : profile?.city
      ? radius               // logged-in user's saved preference
      : 2000                 // guest fallback: show everything

  const saveGuestCity = (city: string) => {
    const trimmed = city.trim()
    setGuestCity(trimmed)
    if (typeof window !== 'undefined') {
      if (trimmed) localStorage.setItem('pawfect_city', trimmed)
      else localStorage.removeItem('pawfect_city')
    }
    setShowLocInput(false)
  }

  // ── Build unified animal list ─────────────────────────────────────
  useEffect(() => {
    // Filter & convert local DB pets
    const localSpecies = speciesFilter ? (RG_TO_LOCAL[speciesFilter] ?? []) : []
    const baseLocal = speciesFilter
      ? pets.filter(p => localSpecies.includes(p.species))
      : pets

    const filteredLocal = prefActive && prefs
      ? applyPreferences(baseLocal, prefs)
      : baseLocal

    const localUnified = filteredLocal.map(localPetToUnified)

    // Fetch RescueGroups using the effective search city/radius
    setRgLoading(true)
    const params = new URLSearchParams({
      location: searchCity,
      limit:    '20',
      radius:   String(searchRadius),
    })
    if (speciesFilter) params.set('type', speciesFilter)

    fetch(`/api/rescuegroups?${params}`)
      .then(r => r.json())
      .then((data: { animals?: UnifiedPet[]; setup?: boolean }) => {
        if (data.setup) {
          setAnimals(localUnified)
        } else {
          const rgPets = (data.animals ?? []).map(a => ({
            ...a,
            // API now returns photos[] directly; fall back to single photo
            photos:  Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
            orgUrl:  a.orgUrl ?? null,
            isLocal: false,
          }))
          setAnimals([...localUnified, ...rgPets])
        }
        setIdx(0)
      })
      .catch(() => { setAnimals(localUnified); setIdx(0) })
      .finally(() => setRgLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, speciesFilter, prefActive, searchCity, searchRadius])

  const isLoading = localLoading || rgLoading || profileLoading
  const pet = animals[idx] ?? null

  // ── Actions ───────────────────────────────────────────────────────
  const handlePass = () => setIdx(i => Math.min(i + 1, animals.length))
  const handleLike = () => {
    if (!pet) return
    if (pet.isLocal) toggleSave(pet.id)
    setMatchedPet(pet)
    setIdx(i => Math.min(i + 1, animals.length))
  }
  const handleUndo = () => setIdx(i => Math.max(i - 1, 0))

  // ── Swipe ─────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 80
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    setSwipeDx(e.touches[0].clientX - touchStartX.current)
  }
  const handleTouchEnd = () => {
    if (swipeDx > SWIPE_THRESHOLD) {
      setSwipeDx(400)
      setTimeout(() => { handleLike(); setSwipeDx(0) }, 150)
    } else if (swipeDx < -SWIPE_THRESHOLD) {
      setSwipeDx(-400)
      setTimeout(() => { handlePass(); setSwipeDx(0) }, 150)
    } else {
      setSwipeDx(0)
    }
  }

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
                <Bell size={20} />
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
                {profile?.city && searchCity === profile.city && (
                  <span className="text-white/40">· within {radius} mi</span>
                )}
                {guestCity && (
                  <span className="text-white/40">· within {searchRadius} mi</span>
                )}
                <Pencil size={10} className="ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Species filter tabs */}
          <div className="flex gap-2 px-1 mb-3 overflow-x-auto scrollbar-none">
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

          {/* Card area */}
          <div className="flex-1 flex flex-col min-h-0">
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
              /* Pet card */
              <div
                className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative select-none"
                style={{
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

                {/* Photo */}
                <div
                  className="relative flex items-center justify-center overflow-hidden flex-1 min-h-0"
                  style={{ minHeight: 160, background: SPECIES_BG[pet.type] ?? SPECIES_BG.other }}
                >
                  {/* Org badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      {pet.isLocal ? '🏠' : <Globe size={10} />}
                      {pet.orgName}
                    </span>
                  </div>

                  {pet.photo ? (
                    <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[100px] select-none drop-shadow-sm">🐾</span>
                  )}

                  {/* Location */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                      <MapPin size={10} />{pet.city}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>
                    {pet.age && <span className="text-gray-400 text-sm">{pet.age}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {[pet.breed, pet.gender, pet.size].filter(Boolean).join(' · ')}
                  </p>
                  {pet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {pet.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {pet.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{pet.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-2">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <button onClick={handlePass}
                      className="w-12 h-12 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm hover:shadow">
                      <X size={20} />
                    </button>
                    <button onClick={handleUndo}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm">
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
            ) : (
              /* Empty state */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
                <span className="text-6xl mb-4">🐾</span>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {animals.length === 0 && prefActive && prefs
                    ? 'No matches for your preferences'
                    : "You've seen them all!"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Check back soon — new animals are added daily.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => setIdx(0)}
                    className="px-5 py-2.5 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: '#e05a4e' }}
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
      {selected && <AnimalDetailSheet animal={selected} onClose={() => setSelected(null)} />}

      {/* ── Match celebration overlay ── */}
      {matchedPet && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
          onClick={() => setMatchedPet(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[340px]"
            onClick={e => e.stopPropagation()}
          >
            {/* Pet photo strip */}
            {(matchedPet.photos?.[0] || matchedPet.photo) && (
              <div
                className="h-44 overflow-hidden"
                style={{ background: SPECIES_BG[matchedPet.type] ?? SPECIES_BG.other }}
              >
                <img
                  src={matchedPet.photos?.[0] ?? matchedPet.photo!}
                  alt={matchedPet.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="px-6 pt-5 pb-6 text-center">
              <div className="text-4xl mb-2">🐾</div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {matchedPet.name} is so excited to meet you!
              </h2>
              <p className="text-sm text-gray-400 mb-5">Here's how to make it official:</p>

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
                {/* Primary CTA — rescue's own website if available, else in-app profile */}
                {matchedPet.isLocal ? (
                  <a
                    href={matchedPet.url}
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    View {matchedPet.name}'s profile &amp; apply →
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
                    Visit {matchedPet.orgName}'s website →
                  </a>
                ) : (
                  <a
                    href={matchedPet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    View {matchedPet.name} on RescueGroups →
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
      )}
    </>
  )
}
