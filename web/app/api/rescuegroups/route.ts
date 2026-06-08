import { NextResponse } from 'next/server'

// ── RescueGroups v5 API ──────────────────────────────────────────────
// Note: the API's filterRadius param is broken server-side (ignored).
// We work around it by pulling a larger batch and filtering by the
// org's lat/lon that comes back in the `included` sideloads.

const RG_BASE    = 'https://api.rescuegroups.org/v5/public'
// Species-specific URL paths (/dogs/, /cats/) reject POST requests.
// We fetch 2 pages of 250 from the base endpoint (RG max is 250/page)
// then filter by distance AND species client-side.
const PAGE_SIZE  = 250
const PAGES      = 4     // 4 × 250 = 1000 animals scanned per request

// Geocode a city name or zip → { lat, lon } using OpenStreetMap Nominatim
async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const isZip = /^\d{5}(-\d{4})?$/.test(location.trim())
    const params = new URLSearchParams({
      q:            location,
      format:       'json',
      limit:        '1',
      countrycodes: 'us',           // constrain to US for reliable zip lookups
      ...(isZip ? { postalcode: location.trim(), country: 'US' } : {}),
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app)' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || !data[0]) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// Haversine distance in miles between two lat/lon points
function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// sizeCurrent is a float (weight in lbs) — convert to human-readable label
function sizeLabel(lbs: number | null | undefined): string | null {
  if (lbs == null) return null
  if (lbs < 10) return 'Small'
  if (lbs < 26) return 'Medium'
  if (lbs < 51) return 'Large'
  return 'XL'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnimal(animal: any, included: any[]) {
  const attr = animal.attributes ?? {}

  // Resolve org from included[]
  const orgRel  = animal.relationships?.orgs?.data
  const orgId   = Array.isArray(orgRel) ? orgRel[0]?.id : orgRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org     = included.find((i: any) => i.type === 'orgs' && i.id === orgId)
  const orgName = org?.attributes?.name ?? 'Nearby Rescue'
  const orgLat: number | null = org?.attributes?.lat ?? null
  const orgLon: number | null = org?.attributes?.lon ?? null

  // Resolve location from included[]
  const locRel = animal.relationships?.locations?.data
  const locId  = Array.isArray(locRel) ? locRel[0]?.id : locRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loc    = included.find((i: any) => i.type === 'locations' && i.id === locId)
  const city   = [
    loc?.attributes?.city  ?? org?.attributes?.city,
    loc?.attributes?.state ?? org?.attributes?.state,
  ].filter(Boolean).join(', ') || 'Nearby'

  // Resolve species name from included[]
  const spRel = animal.relationships?.species?.data
  const spId  = Array.isArray(spRel) ? spRel[0]?.id : spRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp    = included.find((i: any) => i.type === 'species' && i.id === spId)
  const type  = sp?.attributes?.singular ?? attr.species ?? 'Other'

  return {
    id:          String(animal.id),
    name:        (attr.name ?? 'Unknown').trim(),
    type,
    breed:       attr.breedString ?? attr.breedPrimary ?? null,
    age:         attr.ageString   ?? attr.ageGroup     ?? null,
    gender:      attr.sex         ?? 'Unknown',
    size:        sizeLabel(attr.sizeCurrent),
    description: attr.descriptionText ?? attr.description ?? null,
    photo:       attr.pictureThumbnailUrl
                   ? (attr.pictureThumbnailUrl as string).replace('?width=100', '?width=800')
                   : null,
    url:         attr.url ?? 'https://www.rescuegroups.org',
    city,
    orgName,
    tags:        [] as string[],
    // Internal — used for distance filtering, stripped before response
    _lat: orgLat,
    _lon: orgLon,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') ?? ''
  const type     = searchParams.get('type')     ?? ''
  const limit    = parseInt(searchParams.get('limit')  ?? '20',  10)
  const radius   = parseInt(searchParams.get('radius') ?? '100', 10)

  if (!location) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 })
  }

  const apiKey = process.env.RESCUEGROUPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'RescueGroups not configured', setup: true },
      { status: 503 }
    )
  }

  try {
    // Geocode the user's location so we can distance-filter results
    const userCoords = await geocode(location.trim())

    if (!userCoords) {
      return NextResponse.json(
        { error: `Could not geocode location: ${location}`, animals: [] },
        { status: 422 }
      )
    }

    // Species URL paths (/dogs/ etc.) reject POST — always use base endpoint.
    // Fetch PAGES pages of PAGE_SIZE in parallel (RescueGroups max = 250/page).
    // Then filter by distance AND species client-side.
    const endpoint = `${RG_BASE}/animals/search/available/`
    const fields   = [
      'name', 'ageGroup', 'ageString', 'sex',
      'breedPrimary', 'breedString', 'sizeCurrent',
      'pictureThumbnailUrl', 'url', 'descriptionText',
    ].join(',')
    const reqBody  = JSON.stringify({
      filterRadius: { coordinates: `${userCoords.lat},${userCoords.lon}`, miles: radius },
    })
    const reqHeaders = {
      'Content-Type': 'application/vnd.api+json',
      'Authorization': apiKey,
    }

    // Fetch pages in parallel
    const pageResponses = await Promise.all(
      Array.from({ length: PAGES }, (_, i) => {
        const p = new URLSearchParams({
          limit:             String(PAGE_SIZE),
          page:              String(i + 1),
          include:           'orgs,locations,species',
          'fields[animals]': fields,
        })
        return fetch(`${endpoint}?${p}`, {
          method: 'POST', headers: reqHeaders, body: reqBody,
        })
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allData: any[]     = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allIncluded: any[] = []

    for (const res of pageResponses) {
      if (!res.ok) {
        if (allData.length === 0) {
          const errText = await res.text()
          console.error('RescueGroups error:', errText)
          return NextResponse.json({ error: `RescueGroups API error ${res.status}` }, { status: res.status })
        }
        break // subsequent pages failing is non-fatal
      }
      const json   = await res.json()
      allData      = allData.concat(json.data ?? [])
      allIncluded  = allIncluded.concat(json.included ?? [])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = allData.map((a: any) => mapAnimal(a, allIncluded))

    const nearby = all
      .filter((a: ReturnType<typeof mapAnimal>) => {
        if (a._lat == null || a._lon == null) return false
        if (distanceMiles(userCoords!.lat, userCoords!.lon, a._lat, a._lon) > radius) return false
        // Species filter client-side (species URL paths don't support POST)
        if (type && a.type.toLowerCase() !== type.toLowerCase()) return false
        return true
      })
      .slice(0, limit)
      // Strip internal coords before sending to client
      .map(({ _lat: _l, _lon: _o, ...rest }: ReturnType<typeof mapAnimal>) => rest)

    return NextResponse.json({
      animals: nearby,
      pagination: { countReturned: nearby.length },
    })
  } catch (err) {
    console.error('RescueGroups route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
