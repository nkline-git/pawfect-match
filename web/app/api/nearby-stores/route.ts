import { NextResponse } from 'next/server'

// ── Overpass API (OpenStreetMap) — nearby pet stores ─────────────────
// Overpass's free public instance genuinely rate-limits / 504s under
// real load (confirmed: 2 of 3 rapid requests failed server-side in
// testing) even though a single isolated request usually succeeds.
// Routing this server-side (rather than the client fetching Overpass
// directly) lets us retry once and CDN-cache successful responses, so
// repeated or nearby searches don't re-hit Overpass at all.

const CHAIN_NAMES = [
  'petsmart', 'petco', 'pet supplies plus', 'petvalu', 'pet valu',
  'pet supermarket', 'hollywood feed', 'unleashed', 'petland',
  'global pet foods', 'chuck & don', 'pet people', 'petshop',
]

function isChain(name: string) {
  const lower = name.toLowerCase()
  return CHAIN_NAMES.some(c => lower.includes(c))
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type Store = {
  id: number; name: string; lat: number; lon: number; distance: number
  phone?: string; website?: string; address?: string; chain: boolean
}

const fetchOverpass = (query: string) =>
  // Overpass's anti-abuse layer 406s any request with no User-Agent — Node's
  // fetch() sends none by default (confirmed: identical request succeeds
  // with curl's default UA, 406s without one)
  fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: query,
    headers: { 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app; nearby pet store search)' },
    signal: AbortSignal.timeout(20_000),
  }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
  }

  const query = `[out:json][timeout:25];(node["shop"="pet"](around:24000,${lat},${lon});way["shop"="pet"](around:24000,${lat},${lon}););out center;`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null
  try {
    json = await fetchOverpass(query)
  } catch {
    // Overpass 504s are often transient (confirmed: back-to-back requests
    // fail then succeed) — one retry after a short pause clears most of them
    await new Promise(r => setTimeout(r, 1_500))
    try {
      json = await fetchOverpass(query)
    } catch (err) {
      console.error('Overpass failed twice:', err instanceof Error ? err.message : err)
    }
  }

  if (!json) {
    return NextResponse.json({ error: 'Could not load nearby stores' }, { status: 502 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stores: Store[] = (json.elements ?? []).map((el: any) => {
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    const tags  = el.tags ?? {}
    const name  = tags.name ?? tags['name:en'] ?? 'Pet Store'
    const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean)
    return {
      id: el.id, name, lat: elLat, lon: elLon,
      distance: haversine(lat, lon, elLat, elLon),
      phone:   tags.phone ?? tags['contact:phone'],
      website: tags.website ?? tags['contact:website'],
      address: parts.length ? parts.join(' ') : undefined,
      chain:   isChain(name),
    } as Store
  }).filter((s: Store) => s.lat)
    .sort((a: Store, b: Store) => a.distance - b.distance)

  return NextResponse.json({ stores }, {
    // Store locations barely change — cache aggressively so repeat/nearby
    // searches hit the CDN instead of re-querying Overpass
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' },
  })
}
