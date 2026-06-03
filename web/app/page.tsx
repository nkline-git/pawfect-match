'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bell, User, X, RotateCcw, Info, Heart,
  MapPin, ExternalLink, SlidersHorizontal, Globe,
} from 'lucide-react'
import { usePets, useSavedPets } from '@/hooks/usePets'
import { useProfile } from '@/hooks/useProfile'
import BottomNav from '@/components/ui/BottomNav'
import type { PetSpecies, PetPreferences, Pet } from '@/types'

// ── Petfinder mapped animal shape (from /api/petfinder) ─────────────
interface PfPet {
  id: string
  name: string
  type: string
  breed: string | null
  age: string | null
  gender: string
  size: string | null
  description: string | null
  photo: string | null
  url: string
  city: string
  orgName: string
  tags: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────
function applyPreferences(pets: Pet[], prefs: PetPreferences | null): Pet[] {
  if (!prefs) return pets
  return pets.filter(p => {
    if (prefs.species.length > 0 && !prefs.species.includes(p.species)) return false
    if (prefs.size.length > 0 && p.size && !prefs.size.includes(p.size)) return false
    if (prefs.energy.length > 0 && p.energy && !prefs.energy.includes(p.energy)) return false
    if (prefs.good_with_kids === true && !p.good_with.includes('Kids')) return false
    if (prefs.good_with_dogs === true && !p.good_with.includes('Dogs')) return false
    if (prefs.good_with_cats === true && !p.good_with.includes('Cats')) return false
    return true
  })
}

// ── Constants ────────────────────────────────────────────────────────
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

const PF_TYPE_BG: Record<string, string> = {
  Dog:             'linear-gradient(135deg,#f5e6d3,#eddccc)',
  Cat:             'linear-gradient(135deg,#e8d5f5,#d5c4e8)',
  Rabbit:          'linear-gradient(135deg,#d5f0e8,#c4e8d5)',
  Bird:            'linear-gradient(135deg,#d5e8f5,#c4d5e8)',
  'Small & Furry': 'linear-gradient(135deg,#f5f0d5,#e8e0c4)',
}
const PF_DEFAULT_BG = 'linear-gradient(135deg,#f5d5e8,#e8c4d5)'

const LOCAL_TABS = [
  { label: 'All',     value: 'all',    icon: '🐾' },
  { label: 'Dogs',    value: 'dog',    icon: '🐕' },
  { label: 'Cats',    value: 'cat',    icon: '🐱' },
  { label: 'Rabbits', value: 'rabbit', icon: '🐰' },
  { label: 'Near me', value: 'near',   icon: '📍' },
]

const PF_TABS = [
  { label: 'All',     value: '',              icon: '🐾' },
  { label: 'Dogs',    value: 'Dog',           icon: '🐕' },
  { label: 'Cats',    value: 'Cat',           icon: '🐱' },
  { label: 'Rabbits', value: 'Rabbit',        icon: '🐰' },
  { label: 'Birds',   value: 'Bird',          icon: '🦜' },
  { label: 'Small',   value: 'Small & Furry', icon: '🐹' },
]

// ── Component ────────────────────────────────────────────────────────
export default function BrowsePage() {
  // Local pets state
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [currentIdx,    setCurrentIdx]    = useState(0)
  const [prefActive,    setPrefActive]    = useState(true)

  // Source / Petfinder state
  const [source,      setSource]      = useState<'local' | 'petfinder'>('local')
  const [pfFilter,    setPfFilter]    = useState('')   // PF type string: 'Dog', 'Cat', …
  const [pfAnimals,   setPfAnimals]   = useState<PfPet[]>([])
  const [pfLoading,   setPfLoading]   = useState(false)
  const [pfIdx,       setPfIdx]       = useState(0)
  const [pfSetupMsg,  setPfSetupMsg]  = useState(false) // 503 — keys not configured

  // Swipe state (shared; only one source active at a time)
  const [swipeDx,   setSwipeDx]   = useState(0)
  const touchStartX = useRef(0)

  const { pets, loading: localLoading } = usePets()
  const { savedIds, toggleSave }        = useSavedPets()
  const { profile, loading: profileLoading } = useProfile()

  const prefs   = profile?.preferences ?? null
  const isLocal = source === 'local'
  const isPf    = source === 'petfinder'

  // ── Petfinder fetch ──────────────────────────────────────────────
  useEffect(() => {
    if (!isPf) return
    const city = profile?.city
    if (!city) return

    setPfLoading(true)
    setPfSetupMsg(false)
    const params = new URLSearchParams({ location: city, limit: '20' })
    if (pfFilter) params.set('type', pfFilter)

    fetch(`/api/petfinder?${params.toString()}`)
      .then(r => r.json())
      .then((data: { animals?: PfPet[]; setup?: boolean; error?: string }) => {
        if (data.setup) { setPfSetupMsg(true); return }
        setPfAnimals(data.animals ?? [])
        setPfIdx(0)
      })
      .catch(console.error)
      .finally(() => setPfLoading(false))
  }, [isPf, pfFilter, profile?.city])

  // ── Local pet filtering ──────────────────────────────────────────
  const bySpecies = (speciesFilter === 'all' || speciesFilter === 'near')
    ? pets
    : pets.filter(p => p.species === (speciesFilter as PetSpecies))
  const filtered = (prefActive && prefs) ? applyPreferences(bySpecies, prefs) : bySpecies
  const pet   = filtered[currentIdx] ?? null
  const pfPet = pfAnimals[pfIdx] ?? null

  // ── Local handlers ───────────────────────────────────────────────
  const handlePass = () => setCurrentIdx(i => Math.min(i + 1, filtered.length))
  const handleLike = () => {
    if (pet) toggleSave(pet.id)
    setCurrentIdx(i => Math.min(i + 1, filtered.length))
  }
  const handleUndo = () => setCurrentIdx(i => Math.max(i - 1, 0))

  // ── Petfinder handlers ───────────────────────────────────────────
  const handlePfPass = () => setPfIdx(i => Math.min(i + 1, pfAnimals.length))
  const handlePfLike = () => {
    if (pfPet) window.open(pfPet.url, '_blank', 'noreferrer')
    setPfIdx(i => Math.min(i + 1, pfAnimals.length))
  }
  const handlePfUndo = () => setPfIdx(i => Math.max(i - 1, 0))

  // ── Touch / swipe (shared) ────────────────────────────────────────
  const SWIPE_THRESHOLD = 80
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    setSwipeDx(e.touches[0].clientX - touchStartX.current)
  }
  const handleTouchEnd = () => {
    if (swipeDx > SWIPE_THRESHOLD) {
      setSwipeDx(500)
      setTimeout(() => {
        if (isPf) handlePfLike(); else handleLike()
        setSwipeDx(0)
      }, 280)
    } else if (swipeDx < -SWIPE_THRESHOLD) {
      setSwipeDx(-500)
      setTimeout(() => {
        if (isPf) handlePfPass(); else handlePass()
        setSwipeDx(0)
      }, 280)
    } else {
      setSwipeDx(0)
    }
  }

  // ── Loading flag (unified) ────────────────────────────────────────
  const isLoading = isLocal
    ? localLoading
    : pfLoading || (profileLoading && !profile?.city)

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🐾</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Pawfect</span>
              <span className="text-gray-900"> Match</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isLocal && prefs && (
              <button
                onClick={() => setPrefActive(v => !v)}
                title={prefActive ? 'Preferences active — click to see all' : 'Show matched only'}
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

        {/* ── Preferences banner ── */}
        {isLocal && profile && !prefs && (
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

        {/* ── Source toggle ── */}
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <button
            onClick={() => setSource('local')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              isLocal
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={isLocal ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
          >
            🐾 Local rescues
          </button>
          <button
            onClick={() => setSource('petfinder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              isPf
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={isPf ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6' } : {}}
          >
            <Globe size={13} /> Petfinder
          </button>
        </div>

        {/* ── Species filter tabs ── */}
        <div className="flex gap-2 px-1 mb-3 overflow-x-auto scrollbar-none">
          {(isLocal ? LOCAL_TABS : PF_TABS).map(tab => {
            const active = isLocal ? speciesFilter === tab.value : pfFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => {
                  if (isLocal) { setSpeciesFilter(tab.value); setCurrentIdx(0) }
                  else { setPfFilter(tab.value); setPfIdx(0) }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={active
                  ? { backgroundColor: isLocal ? '#e05a4e' : '#3b82f6', borderColor: isLocal ? '#e05a4e' : '#3b82f6' }
                  : {}}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Card area ── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Loading skeleton */}
          {isLoading ? (
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

          /* Petfinder: API keys not configured */
          ) : isPf && pfSetupMsg ? (
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
              <span className="text-5xl mb-4">🔑</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Petfinder not configured</h3>
              <p className="text-sm text-gray-500">
                Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">PETFINDER_API_KEY</code> and{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">PETFINDER_SECRET</code>{' '}
                to your environment variables to enable Petfinder browsing.
              </p>
            </div>

          /* Petfinder: no city set in profile */
          ) : isPf && !profile?.city ? (
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
              <span className="text-5xl mb-4">📍</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Set your city first</h3>
              <p className="text-sm text-gray-500 mb-5">
                Petfinder needs your location to find adoptable pets near you.
              </p>
              <a
                href="/profile"
                className="px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow"
                style={{ backgroundColor: '#3b82f6' }}
              >
                Go to Profile
              </a>
            </div>

          /* Local pet card */
          ) : isLocal && pet ? (
            <div
              className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative select-none"
              style={{
                transform: `translateX(${swipeDx}px) rotate(${swipeDx * 0.04}deg)`,
                transition: swipeDx === 0 ? 'transform 0.3s ease' : 'none',
                willChange: 'transform',
                touchAction: 'pan-y',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {swipeDx > 10 && (
                <div className="absolute inset-0 z-20 flex items-start justify-start p-6 pointer-events-none rounded-2xl"
                  style={{ opacity: Math.min(swipeDx / 100, 1), background: 'rgba(34,197,94,0.15)' }}>
                  <div className="border-4 border-green-500 rounded-lg px-3 py-1 rotate-[-15deg]">
                    <span className="text-green-500 text-2xl font-black tracking-wide">LIKE</span>
                  </div>
                </div>
              )}
              {swipeDx < -10 && (
                <div className="absolute inset-0 z-20 flex items-start justify-end p-6 pointer-events-none rounded-2xl"
                  style={{ opacity: Math.min(-swipeDx / 100, 1), background: 'rgba(239,68,68,0.15)' }}>
                  <div className="border-4 border-red-500 rounded-lg px-3 py-1 rotate-[15deg]">
                    <span className="text-red-500 text-2xl font-black tracking-wide">NOPE</span>
                  </div>
                </div>
              )}

              {/* Photo area */}
              <div className="relative flex items-center justify-center overflow-hidden flex-1 min-h-0"
                style={{ minHeight: 160, background: SPECIES_BG[pet.species] ?? SPECIES_BG.other }}>
                <div className="absolute top-3 left-3 z-10">
                  <a
                    href={pet.rescue?.id ? `/rescues/${pet.rescue.id}` : '#'}
                    className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm hover:bg-white transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    {pet.rescue?.logo ?? '🏠'} {pet.rescue?.name ?? 'Unknown Rescue'}
                    <ExternalLink size={10} className="text-gray-400" />
                  </a>
                </div>
                {pet.photos.length > 0 ? (
                  <img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[100px] select-none drop-shadow-sm">
                    {SPECIES_EMOJI[pet.species] ?? '🐾'}
                  </span>
                )}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                    <MapPin size={10} />{pet.rescue?.city ?? '—'}
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
                  {[pet.breed, pet.gender, pet.size, pet.fee != null ? `$${(pet.fee / 100).toFixed(0)}` : 'Free']
                    .filter(Boolean).join(' · ')}
                </p>
                {pet.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {pet.traits.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                {pet.description && (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{pet.description}</p>
                )}
              </div>

              {/* Actions */}
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
                  <a href={`/pets/${pet.id}`}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm">
                    <Info size={16} />
                  </a>
                  <button onClick={handleLike}
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm hover:shadow"
                    style={{ borderColor: '#e05a4e', color: '#e05a4e', backgroundColor: savedIds.has(pet.id) ? '#fef2f2' : 'white' }}>
                    <Heart size={20} fill={savedIds.has(pet.id) ? '#e05a4e' : 'none'} />
                  </button>
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 px-2 pb-1">
                  <span>← swipe or tap to pass</span>
                  <span>like: swipe or tap →</span>
                </div>
              </div>
            </div>

          /* Petfinder card */
          ) : isPf && pfPet ? (
            <div
              className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative select-none"
              style={{
                transform: `translateX(${swipeDx}px) rotate(${swipeDx * 0.04}deg)`,
                transition: swipeDx === 0 ? 'transform 0.3s ease' : 'none',
                willChange: 'transform',
                touchAction: 'pan-y',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {swipeDx > 10 && (
                <div className="absolute inset-0 z-20 flex items-start justify-start p-6 pointer-events-none rounded-2xl"
                  style={{ opacity: Math.min(swipeDx / 100, 1), background: 'rgba(34,197,94,0.15)' }}>
                  <div className="border-4 border-green-500 rounded-lg px-3 py-1 rotate-[-15deg]">
                    <span className="text-green-500 text-2xl font-black tracking-wide">LIKE</span>
                  </div>
                </div>
              )}
              {swipeDx < -10 && (
                <div className="absolute inset-0 z-20 flex items-start justify-end p-6 pointer-events-none rounded-2xl"
                  style={{ opacity: Math.min(-swipeDx / 100, 1), background: 'rgba(239,68,68,0.15)' }}>
                  <div className="border-4 border-red-500 rounded-lg px-3 py-1 rotate-[15deg]">
                    <span className="text-red-500 text-2xl font-black tracking-wide">NOPE</span>
                  </div>
                </div>
              )}

              {/* Photo area */}
              <div className="relative flex items-center justify-center overflow-hidden flex-1 min-h-0"
                style={{ minHeight: 160, background: PF_TYPE_BG[pfPet.type] || PF_DEFAULT_BG }}>
                {/* Org badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                    🏠 {pfPet.orgName}
                  </span>
                </div>
                {/* Petfinder source badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="flex items-center gap-1 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#3b82f6' }}>
                    via Petfinder
                  </span>
                </div>
                {pfPet.photo ? (
                  <img src={pfPet.photo} alt={pfPet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[100px] select-none drop-shadow-sm">🐾</span>
                )}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                    <MapPin size={10} />{pfPet.city}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <h2 className="text-2xl font-bold text-gray-900">{pfPet.name}</h2>
                  {pfPet.age && <span className="text-gray-400 text-sm">{pfPet.age}</span>}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {[pfPet.breed, pfPet.gender, pfPet.size].filter(Boolean).join(' · ')}
                </p>
                {pfPet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {pfPet.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                {pfPet.description && (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{pfPet.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-2">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <button onClick={handlePfPass}
                    className="w-12 h-12 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm hover:shadow">
                    <X size={20} />
                  </button>
                  <button onClick={handlePfUndo}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm">
                    <RotateCcw size={16} />
                  </button>
                  <a href={pfPet.url} target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm">
                    <Info size={16} />
                  </a>
                  <button onClick={handlePfLike}
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm hover:shadow"
                    style={{ borderColor: '#3b82f6', color: '#3b82f6', backgroundColor: 'white' }}>
                    <Heart size={20} />
                  </button>
                </div>
                <div className="flex justify-center text-[11px] text-gray-400 pb-1">
                  <span>Like → opens Petfinder to start adoption</span>
                </div>
              </div>
            </div>

          /* Empty state */
          ) : (
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
              <span className="text-6xl mb-4">{isPf ? '🌐' : '🐾'}</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {isLocal && prefActive && prefs && filtered.length === 0 && bySpecies.length > 0
                  ? 'No matches for your preferences'
                  : isPf
                  ? 'No pets found nearby'
                  : "You've seen them all!"}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {isLocal && prefActive && prefs && filtered.length === 0 && bySpecies.length > 0
                  ? 'Try widening your preferences or browse all pets.'
                  : isPf
                  ? 'Try a different animal type or check back soon.'
                  : 'Check back soon for new arrivals.'}
              </p>
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => isLocal ? setCurrentIdx(0) : setPfIdx(0)}
                  className="px-5 py-2.5 rounded-full text-white text-sm font-semibold"
                  style={{ backgroundColor: isPf ? '#3b82f6' : '#e05a4e' }}
                >
                  Start over
                </button>
                {isLocal && prefActive && prefs && (
                  <button onClick={() => setPrefActive(false)}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Show all pets
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
