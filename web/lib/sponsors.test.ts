import { describe, it, expect } from 'vitest'
import { adMatches, pickAd, ctr, isTargeted } from './sponsors'
import type { SponsoredAd } from '@/types'

const base: SponsoredAd = {
  id: 'a', title: 'Ad', body: null, emoji: '🐾', image_url: null, cta_label: 'Learn more',
  cta_url: 'https://x.example', placement: 'match', active: true, starts_at: null, ends_at: null,
  priority: 0, impressions: 0, clicks: 0, created_at: '', updated_at: '',
}
const SAN_DIEGO = { lat: 32.72, lon: -117.16 }
const LA = { lat: 34.05, lon: -118.24 }          // ~112 mi from San Diego
const local = { ...base, id: 'local', target_city: 'San Diego, CA', target_lat: 32.72, target_lon: -117.16, target_radius_mi: 25 }
const now = new Date('2026-10-18T12:00:00Z')

describe('adMatches', () => {
  it('nationwide ads show to everyone, including visitors with no location', () => {
    expect(adMatches(base, null, now)).toBe(true)
    expect(adMatches(base, LA, now)).toBe(true)
  })

  it('targeted ads show only inside their radius, never to unknown locations', () => {
    expect(isTargeted(local)).toBe(true)
    expect(adMatches(local, SAN_DIEGO, now)).toBe(true)
    expect(adMatches(local, LA, now)).toBe(false)
    expect(adMatches(local, null, now)).toBe(false)
  })

  it('respects active and the start/end schedule', () => {
    expect(adMatches({ ...base, active: false }, null, now)).toBe(false)
    expect(adMatches({ ...base, starts_at: '2026-10-19T00:00:00Z' }, null, now)).toBe(false)
    expect(adMatches({ ...base, ends_at: '2026-10-17T00:00:00Z' }, null, now)).toBe(false)
    expect(adMatches({ ...base, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-31T00:00:00Z' }, null, now)).toBe(true)
  })

  it('treats partially-set targeting as nationwide', () => {
    expect(isTargeted({ ...base, target_lat: 1, target_lon: 2, target_radius_mi: null })).toBe(false)
  })
})

describe('pickAd', () => {
  it('returns null when nothing is eligible', () => {
    expect(pickAd([local], LA, now)).toBeNull()
    expect(pickAd([], SAN_DIEGO, now)).toBeNull()
  })

  it('higher priority wins', () => {
    const hi = { ...base, id: 'hi', priority: 5 }
    expect(pickAd([base, hi], null, now)?.id).toBe('hi')
  })

  it('a local sponsor beats a nationwide one at the same priority', () => {
    expect(pickAd([base, local], SAN_DIEGO, now, () => 0)?.id).toBe('local')
    expect(pickAd([base, local], SAN_DIEGO, now, () => 0.99)?.id).toBe('local')
  })

  it('outside the local area, the nationwide ad shows instead', () => {
    expect(pickAd([base, local], LA, now)?.id).toBe('a')
  })

  it('rotates between equal sponsors', () => {
    const b = { ...base, id: 'b' }
    expect(pickAd([base, b], null, now, () => 0)?.id).toBe('a')
    expect(pickAd([base, b], null, now, () => 0.99)?.id).toBe('b')
  })
})

describe('ctr', () => {
  it('formats click-through rate', () => {
    expect(ctr(0, 0)).toBe('—')
    expect(ctr(1000, 42)).toBe('4.2%')
  })
})
