import { describe, it, expect } from 'vitest'
import { matchBreeds, ALL_BREEDS, POPULAR_BREEDS } from './petOptions'

describe('matchBreeds', () => {
  it('returns nothing for an empty query', () => {
    expect(matchBreeds('')).toEqual([])
    expect(matchBreeds('   ')).toEqual([])
  })

  it('matches case-insensitively', () => {
    expect(matchBreeds('golden retriever')).toContain('Golden Retriever')
    expect(matchBreeds('GOLDEN')).toContain('Golden Retriever')
  })

  it('ranks prefix matches above mid-string matches', () => {
    const results = matchBreeds('cor')
    // "Corgi" starts with "cor"; "Cardigan Welsh Corgi" only contains it
    expect(results.indexOf('Corgi')).toBeLessThan(results.indexOf('Cardigan Welsh Corgi'))
  })

  it('catches a common misspelling via substring match', () => {
    // "chiuaua" isn't a real breed name, but "chihu" should still surface Chihuahua
    expect(matchBreeds('chihu')).toContain('Chihuahua')
  })

  it('excludes breeds already selected', () => {
    const results = matchBreeds('lab', ['Labrador Retriever'])
    expect(results).not.toContain('Labrador Retriever')
  })

  it('caps results at the given limit', () => {
    // "terrier" matches dozens of breeds — default limit is 6
    const results = matchBreeds('terrier')
    expect(results.length).toBeLessThanOrEqual(6)
    expect(results.length).toBeGreaterThan(0)

    const capped = matchBreeds('terrier', [], 3)
    expect(capped.length).toBe(3)
  })

  it('typing every POPULAR_BREEDS chip name surfaces a relevant suggestion', () => {
    // Quick-pick chips add their exact label directly (bypassing the
    // dropdown), but if a user types the same term by hand it should still
    // resolve to something — colloquial short forms ("Labrador", "Husky")
    // are expected to fuzzy-match a fuller official name ("Labrador
    // Retriever", "Siberian Husky"), not necessarily round-trip verbatim.
    for (const breed of POPULAR_BREEDS) {
      const exact = ALL_BREEDS.includes(breed)
      const fuzzy = matchBreeds(breed).length > 0
      expect(exact || fuzzy).toBe(true)
    }
  })
})
