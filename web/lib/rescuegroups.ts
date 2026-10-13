// RescueGroups.org v5 public API — request building + response mapping.
//
// Pure functions only (no fetch), shared by the search route and its tests.
// Everything shown to adopters is taken from structured fields the source
// provides; nothing is inferred from free-text descriptions, and nothing is
// filled in when the source leaves it blank.
//
// Notes on the API, verified against live responses (Oct 2026):
//  - Request bodies must be wrapped as { data: { filters: [...] } }.
//  - filterRadius returns zero results however it's shaped, so location is
//    a lat/lon bounding box on orgs.lat / orgs.lon, refined by exact
//    haversine distance afterwards.
//  - "available" search still returns listings untouched for years (~26% of
//    all results had not been updated in 6+ months), so results are limited
//    to recently-updated listings.
//  - The compatibility fields are isKidsOk / isDogsOk / isCatsOk /
//    isHousetrained (not isGoodWithKids / isHouseTrained — those don't exist).
//  - There is no working generic listing URL: rescuegroups.org/animals/detail
//    404s. Only the animal's own `url` (when set) and the org's url /
//    adoptionUrl are real links.

import type { PetPreferences } from '@/types'

export const RG_BASE = 'https://api.rescuegroups.org/v5/public'

/** Listings not updated within this window aren't shown as available. */
export const FRESH_DAYS = 180

/** At or above this radius the search is nationwide (no bounding box). */
export const NATIONWIDE_RADIUS = 2000

export const ANIMAL_FIELDS = [
  'name', 'ageGroup', 'ageString', 'sex', 'breedPrimary', 'breedString',
  'sizeGroup', 'energyLevel', 'pictureThumbnailUrl', 'url', 'descriptionText',
  'isKidsOk', 'isDogsOk', 'isCatsOk', 'isHousetrained', 'isCurrentVaccinations',
  'isSpecialNeeds', 'indoorOutdoor', 'isAdoptionPending', 'updatedDate',
].join(',')

export const ORG_FIELDS = [
  'name', 'city', 'state', 'citystate', 'lat', 'lon', 'phone', 'email', 'url', 'adoptionUrl',
].join(',')

type Filter = { fieldName: string; operation: string; criteria: unknown }

export function searchFilters(opts: {
  lat: number
  lon: number
  radius: number
  species?: string
  now?: Date
}): Filter[] {
  const now = opts.now ?? new Date()
  const filters: Filter[] = [{
    fieldName: 'animals.updatedDate',
    operation: 'greaterthan',
    criteria:  new Date(now.getTime() - FRESH_DAYS * 86_400_000).toISOString(),
  }]
  if (opts.radius < NATIONWIDE_RADIUS) {
    const dLat = opts.radius / 69
    const dLon = opts.radius / (69 * Math.max(0.01, Math.cos(opts.lat * Math.PI / 180)))
    filters.push(
      { fieldName: 'orgs.lat', operation: 'greaterthan', criteria: opts.lat - dLat },
      { fieldName: 'orgs.lat', operation: 'lessthan',    criteria: opts.lat + dLat },
      { fieldName: 'orgs.lon', operation: 'greaterthan', criteria: opts.lon - dLon },
      { fieldName: 'orgs.lon', operation: 'lessthan',    criteria: opts.lon + dLon },
    )
  }
  if (opts.species) {
    filters.push({ fieldName: 'species.singular', operation: 'equal', criteria: opts.species })
  }
  return filters
}

/**
 * Only http(s) links are passed through; bare domains ("www.example.org")
 * get https://. Anything else (javascript:, mailto:, junk) → null.
 */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  const withScheme = /^https?:\/\//i.test(s) ? s
    : /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s) ? `https://${s}`
    : null
  if (!withScheme) return null
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .trim() || null
}

const SIZE_MAP: Record<string, string> = { Small: 'Small', Medium: 'Medium', Large: 'Large', 'X-Large': 'XL' }
const ENERGY_MAP: Record<string, string> = { Low: 'Low', Moderate: 'Medium', High: 'High' }

export type RgAnimal = {
  id: string
  name: string
  type: string
  breed: string | null
  age: string | null
  gender: string
  size: string | null
  energy: string | null
  goodWith: { kids: boolean | null; dogs: boolean | null; cats: boolean | null }
  description: string | null
  photo: string | null
  photos: string[]
  /** Best real link for this animal (listing → application → org site), or '' */
  url: string
  listingUrl: string | null
  adoptionUrl: string | null
  orgUrl: string | null
  orgEmail: string | null
  orgPhone: string | null
  city: string
  orgName: string
  tags: string[]
  updatedAt: string | null
  adoptionPending: boolean
  lat: number
  lon: number
}

type Rel = { data?: { id: string } | { id: string }[] | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Included = { type: string; id: string; attributes?: Record<string, any> }

function relId(rel: Rel | undefined): string | undefined {
  const d = rel?.data
  return Array.isArray(d) ? d[0]?.id : d?.id ?? undefined
}

function bool(v: unknown): boolean | null {
  return v === true ? true : v === false ? false : null
}

/**
 * Map one search result. Returns null when the animal can't be shown
 * honestly — no organization to contact, or no location to place it.
 */
export function mapAnimal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animal: { id: string | number; attributes?: Record<string, any>; relationships?: Record<string, Rel> },
  included: Included[],
): RgAnimal | null {
  const attr = animal.attributes ?? {}
  const find = (type: string, id: string | undefined) =>
    id ? included.find(i => i.type === type && i.id === id)?.attributes : undefined

  const org = find('orgs', relId(animal.relationships?.orgs))
  const loc = find('locations', relId(animal.relationships?.locations))
  const sp  = find('species', relId(animal.relationships?.species))

  const orgName = typeof org?.name === 'string' ? org.name.trim() : ''
  // (Number(null) is 0 — a missing coordinate must not become 0°N 0°E)
  const lat = org?.lat == null || org.lat === '' ? NaN : Number(org.lat)
  const lon = org?.lon == null || org.lon === '' ? NaN : Number(org.lon)
  if (!orgName || !Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const name = typeof attr.name === 'string' ? attr.name.trim() : ''
  if (!name) return null

  const rawState: string | undefined = loc?.state ?? org?.state
  const state = rawState && rawState.length <= 3 ? rawState.toUpperCase() : rawState
  const city = [loc?.city ?? org?.city, state].filter(Boolean).join(', ') || org?.citystate || ''

  const photo: string | null = typeof attr.pictureThumbnailUrl === 'string'
    ? attr.pictureThumbnailUrl.replace(/\?width=\d+/, '?width=800')
    : null

  const goodWith = { kids: bool(attr.isKidsOk), dogs: bool(attr.isDogsOk), cats: bool(attr.isCatsOk) }
  const ageGroup: string = attr.ageGroup ?? ''
  const energy = ENERGY_MAP[attr.energyLevel] ?? null

  const tags: string[] = []
  if (attr.sex === 'Female') tags.push('Female')
  else if (attr.sex === 'Male') tags.push('Male')
  if (ageGroup === 'Baby' || ageGroup === 'Young') tags.push('Young')
  else if (ageGroup === 'Senior') tags.push('Senior')
  if (attr.isHousetrained === true)        tags.push('House-trained')
  if (goodWith.kids === true)              tags.push('Good with kids')
  if (goodWith.dogs === true)              tags.push('Dog-friendly')
  if (goodWith.cats === true)              tags.push('Cat-friendly')
  if (attr.indoorOutdoor === 'Indoor Only') tags.push('Indoor')
  if (energy === 'High')                   tags.push('High energy')
  if (energy === 'Low')                    tags.push('Low energy')
  if (attr.isCurrentVaccinations === true) tags.push('Vaccinated')
  if (attr.isSpecialNeeds === true)        tags.push('Special needs')

  const listingUrl  = safeUrl(attr.url)
  const adoptionUrl = safeUrl(org?.adoptionUrl)
  const orgUrl      = safeUrl(org?.url)

  return {
    id:          String(animal.id),
    name,
    type:        sp?.singular ?? 'Other',
    breed:       attr.breedString ?? attr.breedPrimary ?? null,
    age:         attr.ageString ?? (ageGroup || null),
    gender:      attr.sex ?? 'Unknown',
    size:        SIZE_MAP[attr.sizeGroup] ?? null,
    energy,
    goodWith,
    description: stripHtml(attr.descriptionText),
    photo,
    photos:      photo ? [photo] : [],
    url:         listingUrl ?? adoptionUrl ?? orgUrl ?? '',
    listingUrl,
    adoptionUrl,
    orgUrl,
    orgEmail:    typeof org?.email === 'string' && org.email.includes('@') ? org.email.trim() : null,
    orgPhone:    typeof org?.phone === 'string' && org.phone.trim() ? org.phone.trim() : null,
    city,
    orgName,
    tags,
    updatedAt:   typeof attr.updatedDate === 'string' ? attr.updatedDate : null,
    adoptionPending: attr.isAdoptionPending === true,
    lat,
    lon,
  }
}

// ── Adopter preferences (the Filters panel) ─────────────────────────────

export type RgPrefs = {
  size: string[]
  energy: string[]
  breeds: string[]
  kids: boolean
  dogs: boolean
  cats: boolean
}

/** Client side: encode the adopter's saved preferences as query params. */
export function prefsToParams(prefs: PetPreferences | null | undefined): Record<string, string> {
  if (!prefs) return {}
  const out: Record<string, string> = {}
  if (prefs.size?.length)   out.size   = prefs.size.join(',')
  if (prefs.energy?.length) out.energy = prefs.energy.join(',')
  if (prefs.breeds?.length) out.breeds = prefs.breeds.join('|')
  if (prefs.good_with_kids === true) out.kids = '1'
  if (prefs.good_with_dogs === true) out.dogs = '1'
  if (prefs.good_with_cats === true) out.cats = '1'
  return out
}

/** Server side: the inverse of prefsToParams. */
export function parsePrefs(sp: URLSearchParams): RgPrefs {
  const list = (key: string, sep: string) =>
    (sp.get(key) ?? '').split(sep).map(s => s.trim()).filter(Boolean)
  return {
    size:   list('size', ','),
    energy: list('energy', ','),
    breeds: list('breeds', '|'),
    kids:   sp.get('kids') === '1',
    dogs:   sp.get('dogs') === '1',
    cats:   sp.get('cats') === '1',
  }
}

/**
 * Same semantics as lib/matching applyPreferences for local pets: a stated
 * size/energy/breed must match when the source provides one; "must be good
 * with X" requires the source to say so explicitly (unknown doesn't pass).
 */
export function matchesPrefs(a: Pick<RgAnimal, 'size' | 'energy' | 'breed' | 'goodWith'>, p: RgPrefs): boolean {
  if (p.size.length && a.size && !p.size.includes(a.size)) return false
  if (p.energy.length && a.energy) {
    // RescueGroups tops out at "High"; treat it as matching "Very High" too
    const ok = p.energy.includes(a.energy) || (a.energy === 'High' && p.energy.includes('Very High'))
    if (!ok) return false
  }
  if (p.breeds.length && a.breed) {
    const b = a.breed.toLowerCase()
    if (!p.breeds.some(x => b.includes(x.toLowerCase()) || x.toLowerCase().includes(b))) return false
  }
  if (p.kids && a.goodWith.kids !== true) return false
  if (p.dogs && a.goodWith.dogs !== true) return false
  if (p.cats && a.goodWith.cats !== true) return false
  return true
}

export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
