// Sponsor ad selection: schedule, location targeting, and rotation.
//
// Targeting rule: an ad with target coordinates + radius only shows to
// visitors whose location is known AND within that radius — a local
// sponsor is paying for local adopters, so visitors with no location set
// see nationwide ads only. Ads with no targeting show to everyone.

import type { SponsoredAd } from '@/types'
import { haversineMiles } from '@/lib/matching'

export type Coords = { lat: number; lon: number }

/** Last real search location (set on the browse page; never the nationwide default). */
export const VISITOR_COORDS_KEY = 'pawfect_visitor_coords'

export function rememberVisitorCoords(c: Coords | null) {
  try {
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lon)) localStorage.setItem(VISITOR_COORDS_KEY, JSON.stringify({ lat: c.lat, lon: c.lon }))
    else localStorage.removeItem(VISITOR_COORDS_KEY)
  } catch { /* storage unavailable */ }
}

export function readVisitorCoords(): Coords | null {
  try {
    const v = JSON.parse(localStorage.getItem(VISITOR_COORDS_KEY) ?? 'null')
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lon) ? { lat: v.lat, lon: v.lon } : null
  } catch {
    return null
  }
}

export function isTargeted(ad: Pick<SponsoredAd, 'target_lat' | 'target_lon' | 'target_radius_mi'>): boolean {
  return ad.target_lat != null && ad.target_lon != null && ad.target_radius_mi != null
}

/** Whether this ad may be shown right now to a visitor at `coords` (null = unknown). */
export function adMatches(ad: SponsoredAd, coords: Coords | null, now: Date = new Date()): boolean {
  if (!ad.active) return false
  if (ad.starts_at && new Date(ad.starts_at) > now) return false
  if (ad.ends_at && new Date(ad.ends_at) < now) return false
  if (!isTargeted(ad)) return true
  if (!coords) return false
  return haversineMiles(coords.lat, coords.lon, ad.target_lat!, ad.target_lon!) <= ad.target_radius_mi!
}

/**
 * Highest priority wins; ties rotate randomly so equal sponsors share
 * views. Among equal priority, a local (targeted) match beats a
 * nationwide one — it's the more relevant ad for that visitor.
 */
export function pickAd(ads: SponsoredAd[], coords: Coords | null, now: Date = new Date(), random: () => number = Math.random): SponsoredAd | null {
  const eligible = ads.filter(a => adMatches(a, coords, now))
  if (eligible.length === 0) return null
  const top = Math.max(...eligible.map(a => a.priority))
  let pool = eligible.filter(a => a.priority === top)
  const local = pool.filter(isTargeted)
  if (local.length > 0) pool = local
  return pool[Math.floor(random() * pool.length)] ?? pool[0]
}

/** Click-through rate as a display string, e.g. "4.2%" ("—" when no views yet). */
export function ctr(impressions: number, clicks: number): string {
  return impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : '—'
}
