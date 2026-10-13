import { describe, it, expect, vi } from 'vitest'
import { lookupEin, normalizeEin, einErrorMessage } from './ein'

const respond = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300, json: async () => body }) as unknown as typeof fetch

describe('lookupEin', () => {
  it('rejects anything that is not 9 digits without calling the API', async () => {
    const f = respond(200)
    expect(await lookupEin('12-345', f)).toEqual({ status: 'invalid' })
    expect(f).not.toHaveBeenCalled()
    expect(normalizeEin('53-0196605')).toBe('530196605')
  })

  it('accepts a registered 501(c)(3) and returns the IRS name', async () => {
    const f = respond(200, { organization: { name: 'Golden Belt Humane Society', city: 'Great Bend', state: 'KS', subsection_code: 3 } })
    expect(await lookupEin('48-0000000', f)).toEqual({
      status: 'ok', ein: '48-0000000', name: 'Golden Belt Humane Society', city: 'Great Bend', state: 'KS',
    })
  })

  it('treats a 404 or an empty shell record as not found', async () => {
    expect(await lookupEin('82-5551234', respond(404))).toEqual({ status: 'not_found' })
    expect(await lookupEin('12-3456789', respond(200, { organization: { name: 'X', subsection_code: null } })))
      .toEqual({ status: 'not_found' })
  })

  it('rejects nonprofits that are not 501(c)(3)', async () => {
    expect(await lookupEin('11-1111111', respond(200, { organization: { name: 'Some Club', subsection_code: 7 } })))
      .toEqual({ status: 'not_501c3', name: 'Some Club' })
  })

  it('never verifies when the lookup service fails', async () => {
    expect(await lookupEin('11-1111111', respond(503))).toEqual({ status: 'unavailable' })
    const boom = vi.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    expect(await lookupEin('11-1111111', boom)).toEqual({ status: 'unavailable' })
  })

  it('has a user-facing message for every failure', () => {
    for (const r of [{ status: 'invalid' }, { status: 'not_found' }, { status: 'not_501c3', name: null }, { status: 'unavailable' }] as const) {
      expect(einErrorMessage(r).length).toBeGreaterThan(10)
    }
  })
})
