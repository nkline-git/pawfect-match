import { NextResponse } from 'next/server'

// ── In-memory token cache (server-side, survives across requests while the
//    Next.js process is running, refreshes automatically 60s before expiry) ──
let tokenCache: { value: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value
  }
  const id  = process.env.PETFINDER_API_KEY
  const sec = process.env.PETFINDER_SECRET
  if (!id || !sec) throw new Error('PETFINDER_API_KEY / PETFINDER_SECRET not set')

  const res = await fetch('https://api.petfinder.com/v2/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=client_credentials&client_id=${id}&client_secret=${sec}`,
  })
  if (!res.ok) throw new Error(`Petfinder auth ${res.status}: ${await res.text()}`)
  const { access_token, expires_in } = await res.json()
  tokenCache = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
  return access_token
}

// Map Petfinder type string → our species key
const PF_TYPE: Record<string, string> = {
  Dog:                    'Dog',
  Cat:                    'Cat',
  Rabbit:                 'Rabbit',
  Bird:                   'Bird',
  'Small & Furry':        'Small & Furry',
  'Scales, Fins & Other': 'Scales, Fins & Other',
  Horse:                  'Horse',
  Barnyard:               'Barnyard',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnimal(a: any, orgNames: Record<string, string>) {
  const photo = a.primary_photo_cropped?.medium
    ?? a.photos?.[0]?.medium
    ?? a.photos?.[0]?.large
    ?? null
  const city  = a.contact?.address?.city  ?? null
  const state = a.contact?.address?.state ?? null
  return {
    id:      String(a.id),
    name:    (a.name ?? 'Unknown').trim(),
    type:    a.type   ?? 'Other',
    breed:   a.breeds?.primary ?? null,
    age:     a.age    ?? null,
    gender:  a.gender ?? 'Unknown',
    size:    a.size   ?? null,
    description: a.description ? a.description.replace(/<[^>]+>/g, '').trim() : null,
    photo,
    url:     a.url ?? 'https://www.petfinder.com',
    city:    [city, state].filter(Boolean).join(', ') || 'Nearby',
    orgId:   a.organization_id ?? '',
    orgName: orgNames[a.organization_id ?? ''] ?? 'Nearby Rescue',
    tags:    (a.tags ?? []) as string[],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') ?? ''
  const type     = searchParams.get('type')     ?? ''   // 'Dog', 'Cat', etc.
  const limit    = searchParams.get('limit')    ?? '20'
  const page     = searchParams.get('page')     ?? '1'

  if (!location) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 })
  }

  const missingKeys = !process.env.PETFINDER_API_KEY || !process.env.PETFINDER_SECRET
  if (missingKeys) {
    return NextResponse.json(
      { error: 'Petfinder not configured', setup: true },
      { status: 503 }
    )
  }

  try {
    const token = await getToken()

    const params = new URLSearchParams({
      location,
      distance: '50',
      limit,
      page,
      status: 'adoptable',
    })
    if (type && PF_TYPE[type]) params.set('type', type)

    const res = await fetch(
      `https://api.petfinder.com/v2/animals?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: `Petfinder API error ${res.status}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    const rawAnimals: unknown[] = json.animals ?? []

    // Batch-fetch unique org names (up to 10 unique orgs per page)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgIds = [...new Set((rawAnimals as any[]).map((a: any) => a.organization_id).filter(Boolean))].slice(0, 10) as string[]
    const orgNames: Record<string, string> = {}
    await Promise.all(
      orgIds.map(async id => {
        try {
          const r = await fetch(`https://api.petfinder.com/v2/organizations/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (r.ok) {
            const o = await r.json()
            orgNames[id] = o.organization?.name ?? 'Nearby Rescue'
          }
        } catch { /* non-fatal */ }
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const animals = (rawAnimals as any[]).map(a => mapAnimal(a, orgNames))

    return NextResponse.json({
      animals,
      pagination: json.pagination ?? {},
    })
  } catch (err) {
    console.error('Petfinder route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
