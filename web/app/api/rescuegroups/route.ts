import { NextResponse } from 'next/server'

// ── RescueGroups v5 API ──────────────────────────────────────────────
// https://api.rescuegroups.org/v5/public/docs
// Auth: Authorization header with API key (no token exchange needed)
// Set RESCUEGROUPS_API_KEY in .env.local once you receive your key from:
// https://rescuegroups.org/services/adoptable-pet-data-api/

const RG_BASE = 'https://api.rescuegroups.org/v5/public'

// Map our filter tab value → RescueGroups URL path segment
const RG_SPECIES: Record<string, string> = {
  Dog:             'dogs',
  Cat:             'cats',
  Rabbit:          'rabbits',
  Bird:            'birds',
  'Small & Furry': 'small-furry',
}

// Geocode a city/zip string → lat/lon using OpenStreetMap Nominatim
// (free, no key required, ~100ms overhead)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnimal(animal: any, included: any[]) {
  const attr = animal.attributes ?? {}

  // Resolve org from included[]
  const orgRel = animal.relationships?.orgs?.data
  const orgId  = Array.isArray(orgRel) ? orgRel[0]?.id : orgRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org    = included.find((i: any) => i.type === 'orgs' && i.id === orgId)
  const orgName = org?.attributes?.name ?? 'Nearby Rescue'

  // Resolve location from included[]
  const locRel = animal.relationships?.locations?.data
  const locId  = Array.isArray(locRel) ? locRel[0]?.id : locRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loc    = included.find((i: any) => i.type === 'locations' && i.id === locId)
  const city   = [
    loc?.attributes?.city  ?? org?.attributes?.city,
    loc?.attributes?.state ?? org?.attributes?.state,
  ].filter(Boolean).join(', ') || 'Nearby'

  return {
    id:          String(animal.id),
    name:        (attr.name ?? 'Unknown').trim(),
    type:        attr.species ?? 'Other',
    breed:       attr.breedString ?? attr.breedPrimary ?? null,
    age:         attr.ageString   ?? attr.ageGroup     ?? null,
    gender:      attr.sex         ?? 'Unknown',
    size:        attr.sizeCurrent ?? attr.sizeGroup    ?? null,
    description: attr.descriptionText ?? attr.description ?? null,
    photo:       attr.pictureThumbnailUrl ?? null,
    url:         attr.url ?? 'https://www.rescuegroups.org',
    city,
    orgName,
    tags:        [] as string[],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') ?? ''
  const type     = searchParams.get('type')     ?? ''
  const limit    = searchParams.get('limit')    ?? '20'
  const page     = searchParams.get('page')     ?? '1'

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
    // Build filterRadius — zip codes go straight through; city names get geocoded
    const isZip = /^\d{5}(-\d{4})?$/.test(location.trim())
    let filterRadius: Record<string, unknown>

    if (isZip) {
      filterRadius = { postalcode: location.trim(), miles: 50 }
    } else {
      const coords = await geocode(location)
      if (!coords) {
        return NextResponse.json(
          { error: `Could not geocode location: ${location}`, animals: [] },
          { status: 422 }
        )
      }
      filterRadius = { coordinates: `${coords.lat},${coords.lon}`, miles: 50 }
    }

    // Species-specific path segment if a type filter was requested
    const speciesSegment = type && RG_SPECIES[type] ? `${RG_SPECIES[type]}/` : ''
    const endpoint = `${RG_BASE}/animals/search/available/${speciesSegment}`

    const params = new URLSearchParams({
      limit,
      page,
      sort:            '+distance',
      include:         'orgs,locations',
      'fields[animals]': [
        'name', 'ageGroup', 'ageString', 'sex',
        'breedPrimary', 'breedString', 'sizeCurrent',
        'pictureThumbnailUrl', 'url',
        'description', 'descriptionText', 'species',
      ].join(','),
    })

    const res = await fetch(`${endpoint}?${params}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ filterRadius }),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const animals = (json.data ?? []).map((a: any) => mapAnimal(a, included))

    return NextResponse.json({
      animals,
      pagination: json.meta ?? {},
    })
  } catch (err) {
    console.error('RescueGroups route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
