// Geocode a US city string ("Wichita, KS" or zip) via Nominatim.
// Best-effort: returns null on any failure — callers treat coords as optional.
export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = city.trim()
  if (!trimmed) return null
  try {
    const isZip = /^\d{5}(-\d{4})?$/.test(trimmed)
    const params = new URLSearchParams({
      q: trimmed,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
      ...(isZip ? { postalcode: trimmed, country: 'US' } : {}),
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'en-US,en' },
    })
    const json = await res.json()
    if (!Array.isArray(json) || json.length === 0) return null
    return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) }
  } catch {
    return null
  }
}
