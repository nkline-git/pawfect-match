'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink } from 'lucide-react'
import { pickAd, readVisitorCoords, type Coords } from '@/lib/sponsors'
import type { AdPlacement, SponsoredAd } from '@/types'

// Sponsor banner — every ad is added and approved by an admin (see /admin
// "Ads" tab), so every placement is pet-related by construction. No
// third-party ad network involved. Location-targeted ads only show to
// visitors inside the sponsor's area (see lib/sponsors.ts).
export default function SponsoredBanner({
  placement,
  coords,
  inline = false,
}: {
  placement: AdPlacement
  /** Visitor location; falls back to the last search location the browse page saved */
  coords?: Coords | null
  /** Inside a white popup/sheet: bordered instead of a floating card */
  inline?: boolean
}) {
  const [supabase] = useState(createClient)
  const [ad, setAd]       = useState<SponsoredAd | null>(null)
  const [imgOk, setImgOk] = useState(true)
  const impressionSent = useRef<string | null>(null)
  const lat = coords?.lat
  const lon = coords?.lon

  useEffect(() => {
    let cancelled = false
    supabase
      .from('sponsored_ads')
      .select('*')
      .eq('placement', placement)
      .eq('active', true)
      .then(({ data }) => {
        if (cancelled) return
        const where = lat != null && lon != null ? { lat, lon } : readVisitorCoords()
        setAd(pickAd((data ?? []) as SponsoredAd[], where))
      })
    return () => { cancelled = true }
  }, [supabase, placement, lat, lon])

  // One impression per ad actually shown
  useEffect(() => {
    if (!ad || impressionSent.current === ad.id) return
    impressionSent.current = ad.id
    supabase.rpc('increment_ad_impression', { ad_id: ad.id }).then(() => {})
  }, [ad, supabase])

  if (!ad) return null

  const handleClick = () => {
    supabase.rpc('increment_ad_click', { ad_id: ad.id }).then(() => {})
  }

  return (
    <a
      href={ad.cta_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-3 transition-shadow relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e05a4e] ${
        inline ? 'border border-gray-200 hover:border-gray-300' : 'shadow-sm hover:shadow-md mb-3'
      }`}
    >
      <span className="absolute top-1.5 right-2 text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-px rounded uppercase tracking-wide">
        Sponsored
      </span>
      {ad.image_url && imgOk ? (
        <Image
          src={ad.image_url}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="text-2xl flex-shrink-0" aria-hidden="true">{ad.emoji}</span>
      )}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-sm font-bold text-gray-800 truncate pr-14">{ad.title}</p>
        {ad.body && <p className="text-xs text-gray-500 line-clamp-2">{ad.body}</p>}
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 self-end" style={{ color: '#e05a4e' }}>
        {ad.cta_label} <ExternalLink size={11} />
      </span>
    </a>
  )
}
