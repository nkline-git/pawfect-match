import { NextResponse } from 'next/server'

// ── RescueGroups v5 API ──────────────────────────────────────────────
// Note: the API's filterRadius param is broken server-side (ignored).
// We work around it by pulling a larger batch and filtering by the
// org's lat/lon that comes back in the `included` sideloads.

const RG_BASE    = 'https://api.rescuegroups.org/v5/public'
// Species-specific URL paths (/dogs/, /cats/) reject POST requests.
// We fetch pages from the base endpoint (RG max is 250/page)
// then filter by distance AND species client-side, sorted by distance.
const PAGE_SIZE  = 250
const PAGES      = 8     // 8 × 250 = 2000 animals scanned per request

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

// Strip HTML tags and decode common HTML entities from RescueGroups descriptions
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  return html
    .replace(/<[^>]+>/g, ' ')   // remove tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')    // collapse multiple spaces
    .trim() || null
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
  const rawState = loc?.attributes?.state ?? org?.attributes?.state
  const city   = [
    loc?.attributes?.city  ?? org?.attributes?.city,
    rawState?.length <= 3 ? rawState?.toUpperCase() : rawState,
  ].filter(Boolean).join(', ') || 'Nearby'

  // Resolve species name from included[]
  const spRel = animal.relationships?.species?.data
  const spId  = Array.isArray(spRel) ? spRel[0]?.id : spRel?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp    = included.find((i: any) => i.type === 'species' && i.id === spId)
  const type  = sp?.attributes?.singular ?? attr.species ?? 'Other'

  // Build photo list — use thumbnail (upscaled) as the primary image.
  // We don't request the pictures relationship separately because the search
  // endpoint's included[] becomes enormous at 1000 animals and field name
  // support varies. Thumbnail is reliable; local DB pets have full galleries.
  const thumbUrl: string | null = attr.pictureThumbnailUrl
    ? (attr.pictureThumbnailUrl as string).replace(/\?width=\d+/, '?width=800')
    : null
  const photos: string[] = thumbUrl ? [thumbUrl] : []

  // The rescue's own website — read from whatever org fields the API returns
  // (we don't restrict fields[orgs] so all org attributes come back)
  const orgUrl: string | null =
    org?.attributes?.rescueUrl     ??
    org?.attributes?.website       ??
    org?.attributes?.websiteUrl    ??
    null

  // Contact info — used so the app can offer email/phone CTAs without linking
  // to rescuegroups.org when the rescue hasn't set up their own website
  const orgEmail: string | null =
    org?.attributes?.email        ??
    org?.attributes?.emailAddress ??
    null

  const orgPhone: string | null =
    org?.attributes?.phone        ??
    org?.attributes?.phoneNumber  ??
    null

  // Derive personality tags from structured fields + keyword scan of description
  const desc = (attr.descriptionText ?? attr.description ?? '').toLowerCase()
  const tags: string[] = []
  if (attr.sex === 'Female')                                              tags.push('Female')
  else if (attr.sex === 'Male')                                           tags.push('Male')
  const ageStr = (attr.ageString ?? attr.ageGroup ?? '').toLowerCase()
  if (ageStr.includes('puppy') || ageStr.includes('kitten') || ageStr.includes('baby') || ageStr.includes('young'))
                                                                          tags.push('Young')
  else if (ageStr.includes('senior') || ageStr.includes('older'))        tags.push('Senior')
  // Structured boolean fields take priority, then fall back to keyword scan
  if (!!attr.isHouseTrained || /house.?train|potty.?train|fully.?train/.test(desc))
                                                                          tags.push('House-trained')
  if (!!attr.isGoodWithKids || /good with (kids|children|child)|loves? (kids|children)|great with (kids|children)/.test(desc))
                                                                          tags.push('Good with kids')
  if (!!attr.isGoodWithDogs || /good with (dogs?)|dog.friendly|gets along with (dogs?)/.test(desc))
                                                                          tags.push('Dog-friendly')
  if (!!attr.isGoodWithCats || /good with (cats?)|cat.friendly|gets along with (cats?)/.test(desc))
                                                                          tags.push('Cat-friendly')
  if (/indoor|house cat|inside only/.test(desc))                          tags.push('Indoor')
  if (/playful|energetic|active|loves to play|high.energy/.test(desc))   tags.push('Playful')
  if (/cuddl|affectionate|lap (dog|cat|pet)|loves attention|loves to snuggle/.test(desc))
                                                                          tags.push('Cuddly')
  if (/calm|gentle|mellow|laid.back|easy.going|relaxed|quiet/.test(desc)) tags.push('Calm')
  if (!!attr.isFixed || /spayed|neutered/.test(desc))      tags.push('Fixed')
  if (!!attr.isCurrentShots || /vaccinated|up.to.date|current on shots|microchip/.test(desc))
                                                                          tags.push('Vaccinated')
  if (/leash.train|walks? well on.leash|leash.manners/.test(desc))       tags.push('Leash-trained')
  if (/crate.train|kennel.train/.test(desc))                              tags.push('Crate-trained')
  if (!!attr.isOkForApartment || /apartment|condo|small (space|home)/.test(desc))
                                                                          tags.push('Apartment OK')

  return {
    id:          String(animal.id),
    name:        (attr.name ?? 'Unknown').trim(),
    type,
    breed:       attr.breedString ?? attr.breedPrimary ?? null,
    age:         attr.ageString   ?? attr.ageGroup     ?? null,
    gender:      attr.sex         ?? 'Unknown',
    size:        sizeLabel(attr.sizeCurrent),
    description: stripHtml(attr.descriptionText ?? attr.description),
    photo:       thumbUrl,
    photos,
    url:      attr.url ?? `https://www.rescuegroups.org/animals/detail/?AnimalID=${animal.id}`,
    orgUrl,
    orgEmail,
    orgPhone,
    city,
    orgName,
    tags,
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
      // Structured boolean fields — give us tags even when description is empty
      'isFixed', 'isHouseTrained', 'isGoodWithDogs', 'isGoodWithCats',
      'isGoodWithKids', 'isCurrentShots', 'isOkForApartment',
    ].join(',')
    const reqBody  = JSON.stringify({
      filterRadius: { coordinates: `${userCoords.lat},${userCoords.lon}`, miles: radius },
    })
    const reqHeaders = {
      'Content-Type': 'application/vnd.api+json',
      'Authorization': apiKey,
    }

    // Fetch pages in parallel — each with a 12s timeout so one slow page
    // can't block the rest. Promise.allSettled so partial results are usable.
    const PAGE_TIMEOUT_MS = 12_000
    const settled = await Promise.allSettled(
      Array.from({ length: PAGES }, (_, i) => {
        const p = new URLSearchParams({
          limit:             String(PAGE_SIZE),
          page:              String(i + 1),
          include:           'orgs,locations,species',
          'fields[animals]': fields,
          // Note: don't restrict fields[orgs] — we need lat/lon for distance
          // filtering and want rescueUrl/website for the org link. Let the API
          // return all org fields (the default).
        })
        return fetch(`${endpoint}?${p}`, {
          method: 'POST', headers: reqHeaders, body: reqBody,
          signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allData: any[]     = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allIncluded: any[] = []

    let anySucceeded = false
    for (const result of settled) {
      if (result.status === 'rejected') {
        console.warn('RescueGroups page failed:', result.reason?.message ?? result.reason)
        continue
      }
      anySucceeded = true
      const json = result.value
      allData     = allData.concat(json.data ?? [])
      allIncluded = allIncluded.concat(json.included ?? [])
    }

    if (!anySucceeded) {
      const reasons = [...new Set(
        settled
          .filter((s): s is PromiseRejectedResult => s.status === 'rejected')
          .map(s => String(s.reason?.message ?? s.reason))
      )]
      console.error('All RescueGroups pages failed:', reasons)
      return NextResponse.json({ error: 'All RescueGroups pages failed', reasons }, { status: 502 })
    }

    // Deduplicate animals across pages (same animal can appear on multiple pages)
    const seenIds = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = allData
      .filter((a: any) => {
        if (seenIds.has(String(a.id))) return false
        seenIds.add(String(a.id))
        return true
      })
      .map((a: any) => mapAnimal(a, allIncluded))

    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const nearby = all
      .filter((a: ReturnType<typeof mapAnimal>) => {
        if (a._lat == null || a._lon == null) return false
        if (distanceMiles(userCoords!.lat, userCoords!.lon, a._lat, a._lon) > radius) return false
        // Species filter client-side (species URL paths don't support POST)
        if (type && a.type.toLowerCase() !== type.toLowerCase()) return false
        return true
      })
      // Sort closest first so the first cards are always the most local animals
      .sort((a: ReturnType<typeof mapAnimal>, b: ReturnType<typeof mapAnimal>) => {
        const da = distanceMiles(userCoords!.lat, userCoords!.lon, a._lat!, a._lon!)
        const db = distanceMiles(userCoords!.lat, userCoords!.lon, b._lat!, b._lon!)
        return da - db
      })
      // Attach rounded distance so clients can show "X mi away" without exposing raw coords
      .map((a: ReturnType<typeof mapAnimal>) => ({
        ...a,
        distance: Math.round(distanceMiles(userCoords!.lat, userCoords!.lon, a._lat!, a._lon!)),
      }))

    const total  = nearby.length
    const paged  = nearby
      .slice(offset, offset + limit)
      // Strip internal coords before sending to client (distance is kept)
      .map(({ _lat: _l, _lon: _o, ...rest }: ReturnType<typeof mapAnimal> & { distance: number }) => rest)

    return NextResponse.json({
      animals: paged,
      // Geocoded center of the search — lets the client distance-filter
      // local DB pets against the same origin
      searchCoords: { lat: userCoords.lat, lon: userCoords.lon },
      pagination: { countReturned: paged.length, total, offset },
    })
  } catch (err) {
    console.error('RescueGroups route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
