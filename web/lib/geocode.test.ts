import { describe, it, expect, vi, afterEach } from 'vitest'
import { geocodeCity } from './geocode'

describe('geocodeCity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null for an empty/whitespace-only city without calling fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await geocodeCity('   ')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('parses lat/lon from a successful Nominatim response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => [{ lat: '37.6872', lon: '-97.3301' }],
    }))
    const result = await geocodeCity('Wichita, KS')
    expect(result).toEqual({ lat: 37.6872, lon: -97.3301 })
  })

  it('returns null when Nominatim returns an empty array (no match)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => [] }))
    expect(await geocodeCity('Nowhereville')).toBeNull()
  })

  it('returns null when fetch throws (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await geocodeCity('Wichita, KS')).toBeNull()
  })

  it('adds postalcode params for a 5-digit zip', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ json: async () => [{ lat: '1', lon: '2' }] })
    vi.stubGlobal('fetch', fetchSpy)
    await geocodeCity('67202')
    const url = new URL(fetchSpy.mock.calls[0][0])
    expect(url.searchParams.get('postalcode')).toBe('67202')
    expect(url.searchParams.get('country')).toBe('US')
  })

  it('does not add postalcode params for a city name', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ json: async () => [{ lat: '1', lon: '2' }] })
    vi.stubGlobal('fetch', fetchSpy)
    await geocodeCity('Wichita, KS')
    const url = new URL(fetchSpy.mock.calls[0][0])
    expect(url.searchParams.get('postalcode')).toBeNull()
    expect(url.searchParams.get('q')).toBe('Wichita, KS')
  })
})
