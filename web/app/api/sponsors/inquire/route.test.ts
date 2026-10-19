import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  inserted: [] as unknown[],
  insertError: null as { message: string } | null,
  emailSent: true,
  emails: [] as { subject: string; html: string }[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      insert: async (row: unknown) => { h.inserted.push(row); return { error: h.insertError } },
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  APPROVAL_RECIPIENT: 'owner@example.com',
  sendEmail: async (m: { subject: string; html: string }) => { h.emails.push(m); return { sent: h.emailSent } },
}))

import { POST } from './route'

const post = (body: unknown) => POST(new Request('http://x/api/sponsors/inquire', { method: 'POST', body: JSON.stringify(body) }))
const VALID = { business_name: 'Smith Family Vet', contact_name: 'Sam Smith', email: 'sam@vet.example', package: 'local', city: 'San Diego, CA' }

beforeEach(() => {
  h.inserted = []
  h.insertError = null
  h.emailSent = true
  h.emails = []
})

describe('POST /api/sponsors/inquire', () => {
  it('stores the inquiry and emails the owner', async () => {
    const res = await post(VALID)
    expect(res.status).toBe(200)
    expect(h.inserted).toEqual([expect.objectContaining({ business_name: 'Smith Family Vet', email: 'sam@vet.example', package: 'local' })])
    expect(h.emails[0].subject).toContain('Smith Family Vet')
  })

  it('rejects missing names and bad emails without storing anything', async () => {
    expect((await post({ ...VALID, business_name: ' ' })).status).toBe(400)
    expect((await post({ ...VALID, email: 'not-an-email' })).status).toBe(400)
    expect(h.inserted).toEqual([])
    expect(h.emails).toEqual([])
  })

  it('silently drops bot submissions that fill the hidden field', async () => {
    const res = await post({ ...VALID, company_url: 'http://spam.example' })
    expect(res.status).toBe(200)
    expect(h.inserted).toEqual([])
    expect(h.emails).toEqual([])
  })

  it('escapes HTML in the notification email', async () => {
    await post({ ...VALID, message: '<script>alert(1)</script>' })
    expect(h.emails[0].html).not.toContain('<script>')
    expect(h.emails[0].html).toContain('&lt;script&gt;')
  })

  it('unknown packages become "other"; status cannot be set by the submitter', async () => {
    await post({ ...VALID, package: 'free-forever', status: 'won' })
    expect(h.inserted[0]).toEqual(expect.objectContaining({ package: 'other' }))
    expect(h.inserted[0]).not.toHaveProperty('status')
  })

  it('still succeeds if only the email goes through (e.g. before migration 016)', async () => {
    h.insertError = { message: 'relation "sponsor_inquiries" does not exist' }
    expect((await post(VALID)).status).toBe(200)
  })

  it('reports failure when neither storing nor emailing worked', async () => {
    h.insertError = { message: 'down' }
    h.emailSent = false
    const res = await post(VALID)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/try again/)
  })
})
