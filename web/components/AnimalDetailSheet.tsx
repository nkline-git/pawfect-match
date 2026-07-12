'use client'

// Shared pet detail sheet + display helpers — used by the browse feed and
// the Saved page (extracted from app/page.tsx)
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, MapPin, ExternalLink, Globe } from 'lucide-react'
import type { UnifiedPet, PetPreferences } from '@/types'

// Shorten breed strings: "Domestic Short Hair / Mixed (short coat)" → "Domestic Short Hair"
// Also trims RG compound breeds like "Parakeet - Other" → "Parakeet"
export function shortBreed(breed: string | null): string | null {
  if (!breed) return null
  return breed.split(/[/(]|\s+-\s+/)[0].trim() || breed
}

// Format raw age strings from RG: "6 Years 1 Month" → "6yr 1mo"
export function formatAge(raw: string | null): string | null {
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

// ── Constants ─────────────────────────────────────────────────────────
export const SPECIES_BG: Record<string, string> = {
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
export const SPECIES_EMOJI: Record<string, string> = {
  Dog: '🐕', dog: '🐕',
  Cat: '🐱', cat: '🐱',
  Rabbit: '🐰', rabbit: '🐰',
  Bird: '🦜', bird: '🦜',
  'Small & Furry': '🐹', small_animal: '🐹',
}

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
export default function AnimalDetailSheet({
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
export const TAG_COLORS: Record<string, string> = {
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
