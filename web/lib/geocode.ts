// Geocode a US city string ("Wichita, KS") or zip ("67202") via Nominatim.
// Best-effort: returns null on any failure — callers treat coords as optional.
//
// Nominatim rejects a request that mixes free-text `q` with structured fields
// like `postalcode` (HTTP 400), so a zip goes out as a structured query alone.
export function geocodeParams(location: string): URLSearchParams {
  const trimmed = location.trim()
  const zip = trimmed.match(/^(\d{5})(-\d{4})?$/)?.[1]
  return new URLSearchParams(zip
    ? { postalcode: zip, country: 'us', format: 'json', limit: '1' }
    : { q: trimmed, countrycodes: 'us', format: 'json', limit: '1' })
}

export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = city.trim()
  if (!trimmed) return null
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${geocodeParams(trimmed)}`, {
      headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app)' },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!Array.isArray(json) || json.length === 0) return null
    const lat = parseFloat(json[0].lat)
    const lon = parseFloat(json[0].lon)
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
  } catch {
    return null
  }
}
