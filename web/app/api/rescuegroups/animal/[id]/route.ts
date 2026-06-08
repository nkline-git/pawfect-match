import { NextResponse } from 'next/server'

const RG_BASE = 'https://api.rescuegroups.org/v5/public'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const apiKey = process.env.RESCUEGROUPS_API_KEY

  if (!apiKey || !id) {
    return NextResponse.json({ photos: [] })
  }

  try {
    const p = new URLSearchParams({
      include: 'pictures',
      'fields[pictures]': 'url,urlFullsize',
    })

    const res = await fetch(`${RG_BASE}/animals/${id}?${p}`, {
      headers: {
        Authorization: apiKey,
        'User-Agent': 'PawfectMatch/1.0',
      },
      // Cache each animal's photos for 1 hour (they rarely change)
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ photos: [] })

    const json = await res.json()

    // Extract picture IDs from the animal's relationships
    const picRels = json.data?.relationships?.pictures?.data ?? []
    const picIds: string[] = Array.isArray(picRels)
      ? picRels.map((r: { id: string }) => r.id)
      : []

    // Match picture IDs to their records in included[]
    const included: any[] = json.included ?? []
    const photos: string[] = picIds
      .map((picId) =>
        included.find((i: any) => i.type === 'pictures' && i.id === picId)
      )
      .filter(Boolean)
      .map(
        (pic: any) =>
          pic.attributes?.urlFullsize ?? pic.attributes?.url ?? null
      )
      .filter(Boolean)
      .slice(0, 12) // cap at 12 photos

    return NextResponse.json({ photos })
  } catch {
    return NextResponse.json({ photos: [] })
  }
}
