import { NextResponse } from 'next/server'
import {
  RG_BASE, ANIMAL_FIELDS, ORG_FIELDS, searchFilters, mapAnimal,
  parsePrefs, matchesPrefs, distanceMiles, type RgAnimal,
} from '@/lib/rescuegroups'
import { geocodeCity } from '@/lib/geocode'

// ── RescueGroups v5 search ───────────────────────────────────────────
// Filtering (freshness, location box, species) happens at RescueGroups;
// exact distance, adopter preferences, and pagination happen here. See
// lib/rescuegroups.ts for why it's split this way.

const PAGE_SIZE       = 250    // RescueGroups max per page
const MAX_PAGES       = 8      // cap: 2,000 animals considered per search
const PAGE_TIMEOUT_MS = 12_000

type RgPage = { data?: unknown[]; included?: unknown[]; meta?: { pages?: number; count?: number } }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = (searchParams.get('location') ?? '').trim()
  const type     = searchParams.get('type') ?? ''
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')  ?? '20',  10) || 20))
  const radius   = Math.max(1, parseInt(searchParams.get('radius') ?? '100', 10) || 100)
  const offset   = Math.max(0, parseInt(searchParams.get('offset') ?? '0',   10) || 0)
  const prefs    = parsePrefs(searchParams)

  if (!location) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 })
  }

  const apiKey = process.env.RESCUEGROUPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RescueGroups not configured', setup: true }, { status: 503 })
  }

  try {
    const userCoords = await geocodeCity(location)
    if (!userCoords) {
      return NextResponse.json(
        { error: `Could not find location: ${location}`, animals: [] },
        { status: 422 }
      )
    }

    const body = JSON.stringify({
      data: { filters: searchFilters({ lat: userCoords.lat, lon: userCoords.lon, radius, species: type || undefined }) },
    })
    const fetchPage = (page: number): Promise<RgPage> => {
      const p = new URLSearchParams({
        limit:             String(PAGE_SIZE),
        page:              String(page),
        sort:              '-animals.updatedDate',
        include:           'orgs,locations,species',
        'fields[animals]': ANIMAL_FIELDS,
        'fields[orgs]':    ORG_FIELDS,
      })
      return fetch(`${RG_BASE}/animals/search/available/?${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.api+json', Authorization: apiKey },
        body,
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    }

    // First page tells us how many pages exist; RescueGroups occasionally
    // rejects a request outright, so give it one delayed retry.
    let first: RgPage
    try {
      first = await fetchPage(1)
    } catch {
      await new Promise(r => setTimeout(r, 1_000))
      try {
        first = await fetchPage(1)
      } catch (err) {
        console.error('RescueGroups search failed:', err)
        return NextResponse.json(
          { error: 'Could not reach RescueGroups', reasons: [String(err)] },
          { status: 502 }
        )
      }
    }

    const totalPages = Math.min(MAX_PAGES, first.meta?.pages ?? 1)
    const rest = await Promise.allSettled(
      Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => fetchPage(i + 2))
    )
    const pages = [first, ...rest.flatMap(r => {
      if (r.status === 'fulfilled') return [r.value]
      console.warn('RescueGroups page failed:', r.reason?.message ?? r.reason)
      return []
    })]
    const partial = rest.some(r => r.status === 'rejected')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const included = pages.flatMap(p => (p.included ?? []) as any[])
    const seen = new Set<string>()
    const animals: (RgAnimal & { distance: number })[] = []
    for (const page of pages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const raw of (page.data ?? []) as any[]) {
        const id = String(raw.id)
        if (seen.has(id)) continue
        seen.add(id)
        const a = mapAnimal(raw, included)
        if (!a || a.adoptionPending) continue
        const distance = distanceMiles(userCoords.lat, userCoords.lon, a.lat, a.lon)
        if (distance > radius) continue
        if (!matchesPrefs(a, prefs)) continue
        animals.push({ ...a, distance: Math.round(distance) })
      }
    }
    // Closest first; among equally-close, most recently updated first
    animals.sort((a, b) => a.distance - b.distance || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))

    const paged = animals
      .slice(offset, offset + limit)
      // Raw org coordinates stay server-side; the rounded distance is enough
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ lat, lon, adoptionPending, goodWith, energy, ...rest }) => rest)

    return NextResponse.json({
      animals: paged,
      searchCoords: { lat: userCoords.lat, lon: userCoords.lon },
      pagination: { countReturned: paged.length, total: animals.length, offset },
      partial,
    }, {
      // CDN-cache identical searches for 5 min (serve stale up to 1h while
      // revalidating) — cuts RescueGroups load and absorbs their blips
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('RescueGroups route error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
