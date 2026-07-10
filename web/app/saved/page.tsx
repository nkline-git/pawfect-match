'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, MapPin, Loader2 } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import Link from 'next/link'
import type { Pet, SavedRGAnimal } from '@/types'
import { RG_SAVED_KEY } from '@/types'
import { Globe } from 'lucide-react'

function shortBreed(breed: string | null | undefined): string | null {
  if (!breed) return null
  return breed.split(/[/(]|\s+-\s+/)[0].trim() || breed
}

function formatAge(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  const yr = s.match(/(\d+)\s*year/)?.[1]
  const mo = s.match(/(\d+)\s*month/)?.[1]
  const wk = s.match(/(\d+)\s*week/)?.[1]
  if (yr && mo && mo !== '0') return `${yr}yr ${mo}mo`
  if (yr) return `${yr}yr`
  if (mo) return `${mo}mo`
  if (wk) return `${wk}wk`
  return raw
}

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

type SavedPetRow = { pet: Pet & { rescue?: { name: string; city: string; logo: string } | null } }

export default function SavedPage() {
  const supabase = createClient()

  const [rows, setRows]           = useState<SavedPetRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [rgSaved, setRgSaved]     = useState<SavedRGAnimal[]>([])
  const [isGuest, setIsGuest]     = useState(false)

  useEffect(() => {
    const load = async () => {
      // Load RG animals from localStorage first — available to everyone
      try {
        const stored = localStorage.getItem(RG_SAVED_KEY)
        if (stored) setRgSaved(JSON.parse(stored) as SavedRGAnimal[])
      } catch { /* localStorage unavailable */ }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsGuest(true); setLoading(false); return } // guests see RG likes only

      const { data } = await supabase
        .from('saved_pets')
        .select('pet:pets(*, rescue:rescues(name, city, logo))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setRows((data ?? []) as unknown as SavedPetRow[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const unsave = async (petId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_pets').delete().eq('user_id', user.id).eq('pet_id', petId)
    setRows(r => r.filter(row => row.pet.id !== petId))
  }

  const unsaveRG = (id: string) => {
    const updated = rgSaved.filter(a => a.id !== id)
    setRgSaved(updated)
    try { localStorage.setItem(RG_SAVED_KEY, JSON.stringify(updated)) } catch { /* noop */ }
  }

  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🐾</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Saved</span>
              <span className="text-gray-900"> Pets</span>
            </span>
          </div>
          <Link href="/profile" className="text-gray-400 hover:text-gray-600">
            <span className="text-xl">👤</span>
          </Link>
        </header>

        {/* Sign-in nudge for guests */}
        {isGuest && (
          <a
            href="/login"
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-2 text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#e05a4e,#c44b40)' }}
          >
            <span>🔓</span>
            <span>Sign in to save pets across devices</span>
            <span className="ml-auto text-white/70">→</span>
          </a>
        )}

        <div className="flex-1 overflow-y-auto pb-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-white/60" />
            </div>
          ) : rows.length === 0 && rgSaved.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-20 px-8 text-center">
              <span className="text-6xl mb-4">🤍</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No saved pets yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Tap the heart on any pet card to save them here.
              </p>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: '#e05a4e' }}
              >
                Browse pets
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ── Local shelter pets ── */}
              {rows.map(({ pet }) => (
                <div key={pet.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
                  {/* Thumbnail */}
                  <Link href={`/pets/${pet.id}`} className="flex-shrink-0">
                    <div
                      className="w-24 h-24 flex items-center justify-center"
                      style={{ background: SPECIES_BG[pet.species] ?? SPECIES_BG.other }}
                    >
                      {pet.photos?.[0] ? (
                        <img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{SPECIES_EMOJI[pet.species] ?? '🐾'}</span>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 px-3 py-2.5 min-w-0">
                    <Link href={`/pets/${pet.id}`}>
                      <h3 className="font-bold text-gray-900">{pet.name}</h3>
                      <p className="text-xs text-gray-500 truncate">
                        {[pet.breed, pet.age, pet.gender].filter(Boolean).join(' · ')}
                      </p>
                      {pet.rescue && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <MapPin size={10} />
                          {pet.rescue.city}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <Link
                        href={`/pets/${pet.id}`}
                        className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: '#e05a4e' }}
                      >
                        View
                      </Link>
                      <button
                        onClick={() => unsave(pet.id)}
                        className="text-xs font-medium px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <Heart size={11} fill="#e05a4e" className="text-[#e05a4e]" />
                        Unsave
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* ── RescueGroups liked animals ── */}
              {rgSaved.length > 0 && (
                <>
                  {rows.length > 0 && (
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider px-1 pt-1">
                      From rescue networks
                    </p>
                  )}
                  {rgSaved.map((animal) => {
                    const typeKey = animal.type?.toLowerCase() ?? 'other'
                    return (
                      <div key={animal.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
                        {/* Thumbnail */}
                        <div
                          className="w-24 h-24 flex-shrink-0 flex items-center justify-center"
                          style={{ background: SPECIES_BG[typeKey] ?? SPECIES_BG.other }}
                        >
                          {animal.photo ? (
                            <img src={animal.photo} alt={animal.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{SPECIES_EMOJI[typeKey] ?? '🐾'}</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 px-3 py-2.5 min-w-0">
                          <h3 className="font-bold text-gray-900">{animal.name}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {[shortBreed(animal.breed), formatAge(animal.age), animal.gender].filter(Boolean).join(' · ')}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
                            <MapPin size={10} />
                            {animal.orgName}{animal.city ? ` · ${animal.city}` : ''}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {animal.orgUrl && (
                              <a
                                href={animal.orgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold px-3 py-1 rounded-full text-white flex items-center gap-1"
                                style={{ backgroundColor: '#e05a4e' }}
                              >
                                <Globe size={10} />
                                Adopt
                              </a>
                            )}
                            {animal.orgEmail && (
                              <a
                                href={`mailto:${animal.orgEmail}?subject=Adoption inquiry: ${encodeURIComponent(animal.name)}&body=Hi! I found ${encodeURIComponent(animal.name)} on Pawfect Match and would love to adopt them. Could you share more details?`}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 flex items-center gap-1"
                              >
                                ✉️ Email
                              </a>
                            )}
                            {animal.orgPhone && (
                              <a
                                href={`tel:${animal.orgPhone}`}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 flex items-center gap-1"
                              >
                                📞 Call
                              </a>
                            )}
                            <button
                              onClick={() => unsaveRG(animal.id)}
                              className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center gap-1"
                            >
                              <Heart size={11} fill="#e05a4e" className="text-[#e05a4e]" />
                              Unsave
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
