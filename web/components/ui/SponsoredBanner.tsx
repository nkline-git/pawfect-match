'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink } from 'lucide-react'
import type { AdPlacement, SponsoredAd } from '@/types'

// House-ad banner — every ad is added and approved by an admin (see
// /admin "Ads" tab), so every placement is guaranteed pet-related by
// construction. No third-party ad network involved.
export default function SponsoredBanner({ placement }: { placement: AdPlacement }) {
  const supabase = createClient()
  const [ad, setAd]       = useState<SponsoredAd | null>(null)
  const [imgOk, setImgOk] = useState(true)
  const impressionSent = useRef(false)

  useEffect(() => {
    const now = new Date().toISOString()
    supabase
      .from('sponsored_ads')
      .select('*')
      .eq('placement', placement)
      .eq('active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('priority', { ascending: false })
      .then(({ data }) => {
        const ads = (data ?? []) as SponsoredAd[]
        if (ads.length === 0) return
        // Weighted-ish pick: bias toward higher priority, still rotate
        // among top-priority ties so one sponsor doesn't always win
        const topPriority = ads[0].priority
        const pool = ads.filter(a => a.priority === topPriority)
        setAd(pool[Math.floor(Math.random() * pool.length)])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement])

  useEffect(() => {
    if (!ad || impressionSent.current) return
    impressionSent.current = true
    supabase.rpc('increment_ad_impression', { ad_id: ad.id }).then(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad?.id])

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
      className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 mb-3 hover:shadow-md transition-shadow relative"
    >
      <span className="absolute top-1.5 right-2 text-[9px] font-semibold text-gray-300 uppercase tracking-wide">
        Sponsored
      </span>
      {ad.image_url && imgOk ? (
        <img
          src={ad.image_url}
          alt=""
          className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="text-2xl flex-shrink-0">{ad.emoji}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{ad.title}</p>
        {ad.body && <p className="text-xs text-gray-400 truncate">{ad.body}</p>}
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: '#e05a4e' }}>
        {ad.cta_label} <ExternalLink size={11} />
      </span>
    </a>
  )
}
