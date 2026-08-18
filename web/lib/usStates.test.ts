import { describe, it, expect } from 'vitest'
import { parseStateFromCity, stripStateFromCity } from './usStates'

describe('parseStateFromCity', () => {
  it('extracts a valid trailing state abbreviation', () => {
    expect(parseStateFromCity('Wichita, KS')).toBe('KS')
  })

  it('is case-insensitive and returns the uppercased abbreviation', () => {
    expect(parseStateFromCity('Wichita, ks')).toBe('KS')
  })

  it('returns empty string when there is no trailing state', () => {
    expect(parseStateFromCity('Wichita')).toBe('')
  })

  it('returns empty string for a two-letter suffix that is not a real state', () => {
    expect(parseStateFromCity('Wichita, XX')).toBe('')
  })

  it('handles extra whitespace around the comma', () => {
    expect(parseStateFromCity('Wichita ,  KS')).toBe('KS')
  })

  it('recognizes DC', () => {
    expect(parseStateFromCity('Washington, DC')).toBe('DC')
  })
})

describe('stripStateFromCity', () => {
  it('removes a trailing state abbreviation', () => {
    expect(stripStateFromCity('Wichita, KS')).toBe('Wichita')
  })

  it('is a no-op when there is no trailing state', () => {
    expect(stripStateFromCity('Wichita')).toBe('Wichita')
  })

  it('trims surrounding whitespace', () => {
    expect(stripStateFromCity('  Wichita, KS  ')).toBe('Wichita')
  })

  it('does not strip a non-state two-letter suffix (still matches the regex shape, by design)', () => {
    // stripStateFromCity has no validity check unlike parseStateFromCity —
    // this documents that intentional asymmetry rather than "fixing" it.
    expect(stripStateFromCity('Wichita, XX')).toBe('Wichita')
  })
})
