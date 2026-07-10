'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Phone, Mail, Globe, MapPin,
  Clock, ExternalLink, Loader2, CheckCircle,
  Link2, PenLine, Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import type { PetStore, StoreProduct } from '@/types'

function fmtPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

export default function StorePublicPage() {
  const params   = useParams()
  const router   = useRouter()
  const id       = params.id as string
  const supabase = createClient()

  const [store,    setStore]    = useState<PetStore | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading,  setLoading]  = useState(true)
  const [isOwner,  setIsOwner]  = useState(false)

  useEffect(() => {
    const load = async () => {
      const [storeRes, userRes, productsRes] = await Promise.all([
        supabase.from('pet_stores').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
        // Graceful: table may not exist until the 004 migration is applied
        supabase.from('store_products').select('*').eq('store_id', id)
          .eq('in_stock', true).order('sort').order('created_at').limit(24)
          .then(r => r, () => ({ data: null, error: true })),
      ])
      setStore(storeRes.data)
      if (!productsRes.error && productsRes.data) setProducts(productsRes.data as StoreProduct[])
      if (storeRes.data && userRes.data.user) {
        setIsOwner(userRes.data.user.id === storeRes.data.user_id)
      }
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

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🏪</span>
        <p className="text-white font-semibold">Store not found.</p>
        <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white underline">
          ← Go back
        </button>
      </div>
    )
  }

  const mapsUrl = store.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.address}, ${store.city}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${store.city}`)}`

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Back */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white font-semibold truncate">{store.name}</span>
          </div>
          {isOwner && (
            <Link
              href="/stores/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              <PenLine size={12} /> Edit
            </Link>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">

          {/* Cover + logo */}
          <div className="h-28 w-full" style={{ background: store.cover_color }} />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-3 -mt-8 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl border-2 border-white">
                {store.logo}
              </div>
              {store.verified && (
                <div className="mb-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle size={14} />
                  Verified store
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-0.5">{store.name}</h1>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
            >
              <MapPin size={12} />
              {store.address ? `${store.address}, ${store.city}` : store.city}
              <ExternalLink size={10} className="text-gray-400" />
            </a>

            {/* Announcement / deal banner */}
            {store.announcement && (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
                style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                <Megaphone size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium leading-snug">{store.announcement}</p>
              </div>
            )}

            {store.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{store.description}</p>
            )}

            {/* Specialties */}
            {store.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {store.specialties.map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Hours */}
            {store.hours && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                {store.hours}
              </div>
            )}

            {/* Contact */}
            <div className="space-y-2">
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  {store.phone}
                </a>
              )}
              {store.email && (
                <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  {store.email}
                </a>
              )}
              {store.website && (
                <a
                  href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors"
                >
                  <Globe size={14} className="text-gray-400 flex-shrink-0" />
                  {store.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
              {store.instagram && (
                <a
                  href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors"
                >
                  <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                  Instagram: {store.instagram.startsWith('@') ? store.instagram : `@${store.instagram}`}
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
              {store.facebook && (
                <a
                  href={`https://facebook.com/${store.facebook}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors"
                >
                  <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                  Facebook: {store.facebook}
                  <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Products: the store's own shelf ── */}
        {products.length > 0 && (
          <div className="mb-4">
            <h2 className="text-white font-bold text-base mb-2 px-1 flex items-center gap-1.5">
              🛒 Shop {store.name.split(' ')[0] === 'The' ? store.name.split(' ').slice(0, 3).join(' ') : store.name}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="h-24 relative overflow-hidden bg-gray-50 flex items-center justify-center">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-4xl">{p.emoji}</span>
                    )}
                    {p.compare_at && p.price && p.compare_at > p.price && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-green-500">
                        {Math.round((1 - p.price / p.compare_at) * 100)}% off
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-0.5">{p.name}</p>
                    {p.description && (
                      <p className="text-[10px] text-gray-400 line-clamp-2 mb-1">{p.description}</p>
                    )}
                    <div className="mt-auto flex items-baseline gap-1.5">
                      {p.price != null ? (
                        <>
                          <span className="text-sm font-bold text-gray-900">{fmtPrice(p.price)}</span>
                          {p.compare_at && p.compare_at > p.price && (
                            <span className="text-[10px] text-gray-400 line-through">{fmtPrice(p.compare_at)}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500">Ask in store</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/50 text-center mt-2">
              Available in-store at {store.name} · {store.city}
            </p>
          </div>
        )}

        {/* Directions CTA */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold shadow-lg mb-6"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <MapPin size={18} />
          Get directions
        </a>

      </div>
    </div>
  )
}
