import { NextResponse } from 'next/server'

const RG_BASE = 'https://api.rescuegroups.org/v5/public'

// RescueGroups v5 picture attribute fields (urlMedium, urlLarge, etc.) are
// either a plain URL string or an object shaped like:
//   { url: "https://...", filesize: 1401259, resolutionX: 4752, resolutionY: 3168 }
type RgPictureUrlField = string | { url?: string; urlFull?: string; urlFullsize?: string; original?: string; filesize?: number } | null | undefined

type RgPicture = {
  id: string
  type: string
  attributes?: {
    urlThumbnail?: RgPictureUrlField
    urlMedium?: RgPictureUrlField
    urlLarge?: RgPictureUrlField
    urlFull?: RgPictureUrlField
    urlFullsize?: RgPictureUrlField
    original?: RgPictureUrlField
    url?: RgPictureUrlField
  }
}

// This helper handles both string and object forms and applies CDN width
// capping so cards load a reasonable 800px image instead of a raw 4752px DSLR shot.
function pickUrl(val: RgPictureUrlField): string | null {
  if (!val) return null
  let url: string | null = null
  if (typeof val === 'string') {
    url = val || null
  } else if (typeof val === 'object') {
    const u = val.url ?? val.urlFull ?? val.urlFullsize ?? val.original
    url = typeof u === 'string' ? u || null : null
  }
  // Append CDN resize param if not already present — keeps cards fast
  if (url && url.includes('cdn.rescuegroups.org') && !url.includes('width=')) {
    url = `${url}?width=800`
  }
  return url
}

function extractFilesize(val: RgPictureUrlField): number {
  if (!val || typeof val !== 'object') return 0
  return typeof val.filesize === 'number' ? val.filesize : 0
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const apiKey = process.env.RESCUEGROUPS_API_KEY

  if (!apiKey || !id) {
    return NextResponse.json({ photos: [] })
  }

  const headers = {
    Authorization: apiKey,
    'User-Agent': 'PawfectMatch/1.0',
  }

  try {
    const p = new URLSearchParams({ include: 'pictures' })
    const res = await fetch(`${RG_BASE}/animals/${id}?${p}`, {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ photos: [] })

    const json = await res.json()

    const animalData = Array.isArray(json.data) ? json.data[0] : json.data

    const picRels = animalData?.relationships?.pictures?.data ?? []
    const picIds: string[] = Array.isArray(picRels)
      ? picRels.map((r: { id: string }) => r.id)
      : []

    const included: RgPicture[] = json.included ?? []

    const pictures = picIds
      .map((picId) => included.find((i) => i.type === 'pictures' && i.id === picId))
      .filter((p): p is RgPicture => Boolean(p))

    // Sort smallest-first so the fastest-loading thumbnail comes first on the card.
    // Full-size photos (4000+ px) are only needed for zoomed detail view.
    pictures.sort((a, b) => {
      const fa = extractFilesize(a.attributes?.urlThumbnail ?? a.attributes?.urlMedium ?? a.attributes?.urlLarge ?? a.attributes?.urlFull ?? a.attributes?.urlFullsize)
      const fb = extractFilesize(b.attributes?.urlThumbnail ?? b.attributes?.urlMedium ?? b.attributes?.urlLarge ?? b.attributes?.urlFull ?? b.attributes?.urlFullsize)
      return fa - fb
    })

    const photos: string[] = pictures
      .map((pic) => {
        const a = pic.attributes ?? {}
        // Prefer medium/large for card display; fall back to fullsize or plain url
        return (
          pickUrl(a.urlMedium)    ??
          pickUrl(a.urlLarge)     ??
          pickUrl(a.urlThumbnail) ??
          pickUrl(a.urlFull)      ??
          pickUrl(a.urlFullsize)  ??
          pickUrl(a.original)     ??
          pickUrl(a.url)          ??
          null
        )
      })
      .filter(Boolean)
      .slice(0, 12) as string[]

    return NextResponse.json({ photos })
  } catch {
    return NextResponse.json({ photos: [] })
  }
}
