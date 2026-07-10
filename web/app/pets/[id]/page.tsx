'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Heart, MapPin, ExternalLink, Phone, Globe,
  Clock, DollarSign, Users, Check, Loader2, X, Send,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
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

type PetWithRescue = Pet & {
  rescue?: {
    id: string
    name: string
    city: string
    logo: string
    phone: string | null
    email: string | null
    website: string | null
  } | null
}

export default function PetDetailPage() {
  const params        = useParams()
  const router        = useRouter()
  const id            = params.id as string
  const supabaseRef   = useRef(createClient())
  const supabase      = supabaseRef.current

  const [pet, setPet]         = useState<PetWithRescue | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved]     = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [applying,       setApplying]       = useState(false)
  const [applied,        setApplied]        = useState(false)
  const [showApplyForm,  setShowApplyForm]  = useState(false)
  const [applyMessage,   setApplyMessage]   = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('pets')
        .select('*, rescue:rescues(id, name, city, logo, phone, email, website)')
        .eq('id', id)
        .single()
      setPet(data)
      setLoading(false)

      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: savedRow } = await supabase
            .from('saved_pets')
            .select('pet_id')
            .eq('user_id', user.id)
            .eq('pet_id', id)
            .maybeSingle()
          setSaved(!!savedRow)

          const { data: appRow } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id)
            .eq('pet_id', id)
            .maybeSingle()
          setApplied(!!appRow)
        }
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const toggleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/pets/${id}`)}`); return }

    if (saved) {
      await supabase.from('saved_pets').delete().eq('user_id', user.id).eq('pet_id', id)
      setSaved(false)
    } else {
      await supabase.from('saved_pets').insert({ user_id: user.id, pet_id: id })
      setSaved(true)
    }
  }

  const handleApply = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/pets/${id}`)}`); return }
    if (!pet) return

    setApplying(true)
    await supabase.from('applications').insert({
      user_id:  user.id,
      pet_id:   id,
      rescue_id: pet.rescue_id,
      message:  applyMessage.trim() || null,
    })
    setApplying(false)
    setApplied(true)
    setShowApplyForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🐾</span>
        <p className="text-white font-semibold">Pet not found.</p>
        <a href="/" className="text-sm text-white/70 hover:text-white underline">← Back to browse</a>
      </div>
    )
  }

  const feeDisplay = pet.fee != null ? `$${(pet.fee / 100).toFixed(0)} adoption fee` : 'Free / donation'

  return (
    <>
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
          <span className="text-white font-semibold">{pet.name}</span>
          <button
            onClick={toggleSave}
            className="ml-auto w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <Heart size={18} fill={saved ? 'white' : 'none'} />
          </button>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">

          {/* Photo gallery */}
          {(() => {
            const photos = pet.photos ?? []
            const safeIdx = Math.min(photoIdx, Math.max(0, photos.length - 1))
            return (
              <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{ height: 300, background: SPECIES_BG[pet.species] ?? SPECIES_BG.other }}
              >
                {photos.length > 0 ? (
                  <img src={photos[safeIdx]} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[120px] select-none drop-shadow-sm">
                    {SPECIES_EMOJI[pet.species] ?? '🐾'}
                  </span>
                )}

                {/* Prev arrow */}
                {photos.length > 1 && safeIdx > 0 && (
                  <button
                    onClick={() => setPhotoIdx(i => i - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {/* Next arrow */}
                {photos.length > 1 && safeIdx < photos.length - 1 && (
                  <button
                    onClick={() => setPhotoIdx(i => i + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}

                {/* Dots */}
                {photos.length > 1 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIdx(i)}
                        className="w-1.5 h-1.5 rounded-full transition-all"
                        style={{ backgroundColor: i === safeIdx ? 'white' : 'rgba(255,255,255,0.45)' }}
                      />
                    ))}
                  </div>
                )}

                {/* Counter */}
                {photos.length > 1 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-white text-[10px] font-semibold bg-black/40 px-2 py-0.5 rounded-full">
                      {safeIdx + 1}/{photos.length}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3">
                  <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                    <MapPin size={10} />
                    {pet.rescue?.city ?? '—'}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Details */}
          <div className="px-5 py-4">
            <div className="flex items-baseline gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
              {pet.age && <span className="text-gray-400">{pet.age}</span>}
            </div>

            <p className="text-sm text-gray-500 mb-3">
              {[pet.breed, pet.gender, pet.size].filter(Boolean).join(' · ')}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <DollarSign size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">{feeDisplay}</span>
              </div>
              {pet.energy && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-sm text-gray-700">⚡ {pet.energy} energy</span>
                </div>
              )}
            </div>

            {/* Traits */}
            {pet.traits.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personality</p>
                <div className="flex flex-wrap gap-1.5">
                  {pet.traits.map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Good with */}
            {pet.good_with.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Good with</p>
                <div className="flex flex-wrap gap-1.5">
                  {pet.good_with.map(g => (
                    <span key={g} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                      <Check size={10} />
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {pet.description && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-gray-600 leading-relaxed">{pet.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rescue card */}
        {pet.rescue && (
          <div className="bg-white rounded-2xl shadow-lg px-5 py-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rescue / Shelter</p>
            <a href={`/rescues/${pet.rescue.id}`} className="flex items-center gap-3 mb-3 group">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                {pet.rescue.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-[#e05a4e] transition-colors">{pet.rescue.name}</p>
                <p className="text-xs text-gray-500">{pet.rescue.city} · <span style={{ color: '#e05a4e' }}>See all their pets →</span></p>
              </div>
            </a>
            <div className="space-y-2">
              {pet.rescue.phone && (
                <a href={`tel:${pet.rescue.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Phone size={14} className="text-gray-400" />
                  {pet.rescue.phone}
                </a>
              )}
              {pet.rescue.email && (
                <a href={`mailto:${pet.rescue.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Users size={14} className="text-gray-400" />
                  {pet.rescue.email}
                </a>
              )}
              {pet.rescue.website && (
                <a href={pet.rescue.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Globe size={14} className="text-gray-400" />
                  Visit website
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Apply button */}
        <button
          onClick={() => { if (!applied) setShowApplyForm(true) }}
          disabled={applied}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-all disabled:opacity-80 flex items-center justify-center gap-2 shadow-lg"
          style={{ backgroundColor: applied ? '#22c55e' : '#e05a4e' }}
        >
          {applied ? '✓ Application sent!' : `Apply to adopt ${pet.name}`}
        </button>
        <p className="text-center text-xs text-white/60 mt-2 mb-6">
          The rescue will reach out to you directly.
        </p>
      </div>
    </div>

    {/* ── Apply slide-up modal ── */}
    {showApplyForm && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setShowApplyForm(false)}
      >
        <div
          className="w-full max-w-[390px] bg-white rounded-2xl shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900">Apply to adopt {pet.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{pet.rescue?.name}</p>
            </div>
            <button onClick={() => setShowApplyForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4">
            {/* Pet summary */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
              <span className="text-2xl">{SPECIES_EMOJI[pet.species] ?? '🐾'}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{pet.name}</p>
                <p className="text-xs text-gray-500">{[pet.breed, pet.age, pet.gender].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            {/* Message */}
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message to the rescue <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder={`Tell ${pet.rescue?.name ?? 'the rescue'} a little about yourself — your home, lifestyle, experience with pets…`}
              rows={4}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-1 placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <p className="text-[11px] text-gray-400 text-right mb-4">{applyMessage.length}/500</p>

            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#e05a4e' }}
            >
              {applying
                ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                : <><Send size={15} /> Send application</>
              }
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
