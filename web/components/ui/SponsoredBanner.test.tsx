import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SponsoredAd } from '@/types'

const h = vi.hoisted(() => ({
  ads: [] as SponsoredAd[],
  rpc: [] as [string, unknown][],
  filters: [] as [string, unknown][],
}))

vi.mock('@/lib/supabase/client', () => {
  const client = {
    from: () => {
      const b = {
        select: () => b,
        eq: (k: string, v: unknown) => { h.filters.push([k, v]); return b },
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: h.ads, error: null }).then(res),
      }
      return b
    },
    rpc: (name: string, args: unknown) => { h.rpc.push([name, args]); return Promise.resolve({}) },
  }
  return { createClient: () => client }
})
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}))

import SponsoredBanner from './SponsoredBanner'

const AD: SponsoredAd = {
  id: 'vet', title: 'Smith Family Vet', body: 'First exam free for new adopters', emoji: '🩺', image_url: null,
  cta_label: 'Book a visit', cta_url: 'https://vet.example', placement: 'match', active: true,
  starts_at: null, ends_at: null, priority: 0, impressions: 0, clicks: 0, created_at: '', updated_at: '',
  target_city: 'San Diego, CA', target_lat: 32.72, target_lon: -117.16, target_radius_mi: 25,
}

beforeEach(() => {
  h.ads = []
  h.rpc = []
  h.filters = []
  localStorage.clear()
})

describe('SponsoredBanner', () => {
  it('shows a local sponsor to a visitor in its area, clearly labeled, and records one view', async () => {
    h.ads = [AD]
    render(<SponsoredBanner placement="match" coords={{ lat: 32.75, lon: -117.1 }} />)
    const link = await screen.findByRole('link', { name: /Smith Family Vet/ })
    expect(link).toHaveAttribute('href', 'https://vet.example')
    expect(link).toHaveAttribute('rel', expect.stringContaining('sponsored'))
    expect(screen.getByText('Sponsored')).toBeInTheDocument()
    expect(h.filters).toEqual(expect.arrayContaining([['placement', 'match'], ['active', true]]))
    await waitFor(() => expect(h.rpc).toEqual([['increment_ad_impression', { ad_id: 'vet' }]]))
  })

  it('records a click', async () => {
    h.ads = [AD]
    const user = userEvent.setup()
    render(<SponsoredBanner placement="match" coords={{ lat: 32.75, lon: -117.1 }} />)
    const link = await screen.findByRole('link', { name: /Smith Family Vet/ })
    link.addEventListener('click', e => e.preventDefault())  // don't navigate in jsdom
    await user.click(link)
    expect(h.rpc).toContainEqual(['increment_ad_click', { ad_id: 'vet' }])
  })

  it('hides a local sponsor from visitors elsewhere — and counts no view', async () => {
    h.ads = [AD]
    const { container } = render(<SponsoredBanner placement="match" coords={{ lat: 40.71, lon: -74.0 }} />)
    await new Promise(r => setTimeout(r, 20))
    expect(container).toBeEmptyDOMElement()
    expect(h.rpc).toEqual([])
  })

  it('uses the location saved by the browse page when none is passed', async () => {
    h.ads = [AD]
    localStorage.setItem('pawfect_visitor_coords', JSON.stringify({ lat: 32.8, lon: -117.2 }))
    render(<SponsoredBanner placement="detail" />)
    expect(await screen.findByText('Smith Family Vet')).toBeInTheDocument()
  })

  it('renders nothing when there are no sponsors', async () => {
    const { container } = render(<SponsoredBanner placement="shop" />)
    await new Promise(r => setTimeout(r, 20))
    expect(container).toBeEmptyDOMElement()
  })
})
