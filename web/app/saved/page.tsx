'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, MapPin, ArrowLeft, Loader2 } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import Link from 'next/link'
import type { Pet } from '@/types'

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
  const router   = useRouter()
  const supabase = createClient()

  const [rows, setRows]       = useState<SavedPetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('saved_pets')
        .select('pet:pets(*, rescue:rescues(name, city, logo))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setRows((data ?? []) as unknown as SavedPetRow[])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const unsave = async (petId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_pets').delete().eq('user_id', user.id).eq('pet_id', petId)
    setRows(r => r.filter(row => row.pet.id !== petId))
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

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-white/60" />
            </div>
          ) : rows.length === 0 ? (
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
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
