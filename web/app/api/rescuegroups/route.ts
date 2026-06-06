import { NextResponse } from 'next/server'

// ── RescueGroups v5 API ──────────────────────────────────────────────
// Note: the API's filterRadius param is broken server-side (ignored).
// We work around it by pulling a larger batch and filtering by the
// org's lat/lon that comes back in the `included` sideloads.

const RG_BASE    = 'https://api.rescuegroups.org/v5/public'
const RADIUS_MI  = 100   // miles — increase if too few results in rural areas
const FETCH_SIZE = 200   // fetch more than needed so filtering leaves enough

// Map our filter tab value → RescueGroups URL path segment
const RG_SPECIES: Record<string, string> = {
  Dog:             'dogs',
  Cat:             'cats',
  Rabbit:          'rabbits',
  Bird:            'birds',
  'Small & Furry': 'small-furry',
}

// Geocode a city name or zip → { lat, lon } using OpenStreetMap Nominatim
async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({ q: location, format: 'json', limit: '1' })
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
  const limit    = parseInt(searchParams.get('limit') ?? '20', 10)

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
    const isZip = /^\d{5}(-\d{4})?$/.test(location.trim())
    let userCoords: { lat: number; lon: number } | null = null

    if (isZip) {
      userCoords = await geocode(location.trim())
    } else {
      userCoords = await geocode(location)
    }

    if (!userCoords) {
      return NextResponse.json(
        { error: `Could not geocode location: ${location}`, animals: [] },
        { status: 422 }
      )
    }

    // Fetch a large batch so we have enough after distance filtering
    const speciesSegment = type && RG_SPECIES[type] ? `${RG_SPECIES[type]}/` : ''
    const endpoint = `${RG_BASE}/animals/search/available/${speciesSegment}`

    const params = new URLSearchParams({
      limit:             String(FETCH_SIZE),
      page:              '1',
      include:           'orgs,locations,species',
      'fields[animals]': [
        'name', 'ageGroup', 'ageString', 'sex',
        'breedPrimary', 'breedString', 'sizeCurrent',
        'pictureThumbnailUrl', 'url',
        'description', 'descriptionText',
      ].join(','),
    })

    const res = await fetch(`${endpoint}?${params}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Authorization': apiKey,
      },
      // Still send filterRadius — may help once RescueGroups fixes their API
      body: JSON.stringify({
        filterRadius: {
          lat:   userCoords.lat,
          lon:   userCoords.lon,
          miles: RADIUS_MI,
        },
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `RescueGroups API error ${res.status}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const included: any[] = json.included ?? []

    // Map all animals, then filter by actual distance using org lat/lon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = (json.data ?? []).map((a: any) => mapAnimal(a, included))

    const nearby = all
      .filter((a: ReturnType<typeof mapAnimal>) => {
        if (a._lat == null || a._lon == null) return false
        return distanceMiles(userCoords!.lat, userCoords!.lon, a._lat, a._lon) <= RADIUS_MI
      })
      .slice(0, limit)
      // Strip internal coords before sending to client
      .map(({ _lat: _l, _lon: _o, ...rest }: ReturnType<typeof mapAnimal>) => rest)

    return NextResponse.json({
      animals: nearby,
      pagination: { ...json.meta, countReturned: nearby.length },
    })
  } catch (err) {
    console.error('RescueGroups route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
