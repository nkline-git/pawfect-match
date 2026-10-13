import { describe, it, expect } from 'vitest'
import {
  mapAnimal, safeUrl, searchFilters, matchesPrefs, prefsToParams, parsePrefs,
  FRESH_DAYS, NATIONWIDE_RADIUS,
} from './rescuegroups'

const ORG = { type: 'orgs', id: 'o1', attributes: {
  name: 'Golden Belt Humane Society', city: 'Great Bend', state: 'KS', lat: 38.36, lon: -98.76,
  phone: '(620) 792-4297', email: 'adopt@example.org', url: 'www.goldenbelt.example', adoptionUrl: null,
} }
const SPECIES = { type: 'species', id: 's1', attributes: { singular: 'Dog' } }

function animal(attrs: Record<string, unknown> = {}, org: string | null = 'o1') {
  return {
    id: 123,
    attributes: { name: ' Pratt ', sex: 'Male', ageGroup: 'Young', ageString: '1 Year', sizeGroup: 'X-Large',
      breedString: 'Pointer / Mixed', updatedDate: '2026-10-12T00:00:00Z', ...attrs },
    relationships: { orgs: { data: org ? [{ id: org }] : [] }, species: { data: [{ id: 's1' }] } },
  }
}

describe('mapAnimal', () => {
  it('maps source fields and resolves org + species from included[]', () => {
    const a = mapAnimal(animal(), [ORG, SPECIES])!
    expect(a).toMatchObject({
      id: '123', name: 'Pratt', type: 'Dog', size: 'XL', gender: 'Male',
      orgName: 'Golden Belt Humane Society', city: 'Great Bend, KS',
      orgPhone: '(620) 792-4297', orgEmail: 'adopt@example.org',
      orgUrl: 'https://www.goldenbelt.example/', updatedAt: '2026-10-12T00:00:00Z',
    })
  })

  it('never invents tags from description text — only structured fields count', () => {
    const a = mapAnimal(animal({
      descriptionText: 'NOT good with kids or cats. Not house trained yet. Will be spayed. Microchipped. Playful and cuddly.',
    }), [ORG, SPECIES])!
    expect(a.tags).toEqual(['Male', 'Young'])
  })

  it('derives compatibility/health tags only when the source says so', () => {
    const a = mapAnimal(animal({
      isKidsOk: true, isDogsOk: false, isCatsOk: true, isHousetrained: true,
      isCurrentVaccinations: true, isSpecialNeeds: true, indoorOutdoor: 'Indoor Only', energyLevel: 'High',
    }), [ORG, SPECIES])!
    expect(a.tags).toEqual(expect.arrayContaining(['Good with kids', 'Cat-friendly', 'House-trained', 'Vaccinated', 'Special needs', 'Indoor', 'High energy']))
    expect(a.tags).not.toContain('Dog-friendly')
    expect(a.goodWith).toEqual({ kids: true, dogs: false, cats: true })
  })

  it('leaves unknowns unknown instead of filling them in', () => {
    const a = mapAnimal(animal({ sizeGroup: undefined, ageString: undefined, ageGroup: undefined, breedString: undefined }), [ORG, SPECIES])!
    expect(a.size).toBeNull()
    expect(a.age).toBeNull()
    expect(a.breed).toBeNull()
    expect(a.goodWith).toEqual({ kids: null, dogs: null, cats: null })
  })

  it('drops animals with no organization to contact or no location', () => {
    expect(mapAnimal(animal({}, null), [ORG, SPECIES])).toBeNull()
    const noCoords = { ...ORG, attributes: { ...ORG.attributes, lat: null, lon: null } }
    expect(mapAnimal(animal(), [noCoords, SPECIES])).toBeNull()
  })

  it('prefers the animal listing, then the adoption page, then the org site — never a made-up URL', () => {
    expect(mapAnimal(animal({ url: 'https://rescue.example/animals/123' }), [ORG, SPECIES])!.url)
      .toBe('https://rescue.example/animals/123')
    const withApp = { ...ORG, attributes: { ...ORG.attributes, adoptionUrl: 'https://rescue.example/apply' } }
    expect(mapAnimal(animal(), [withApp, SPECIES])!.url).toBe('https://rescue.example/apply')
    expect(mapAnimal(animal(), [ORG, SPECIES])!.url).toBe('https://www.goldenbelt.example/')
    const noLinks = { ...ORG, attributes: { ...ORG.attributes, url: null } }
    const a = mapAnimal(animal(), [noLinks, SPECIES])!
    expect(a.url).toBe('')
    expect(JSON.stringify(a)).not.toContain('rescuegroups.org/animals/detail')
  })

  it('flags adoption-pending listings', () => {
    expect(mapAnimal(animal({ isAdoptionPending: true }), [ORG, SPECIES])!.adoptionPending).toBe(true)
  })
})

describe('safeUrl', () => {
  it('accepts http(s) and bare domains, rejects everything else', () => {
    expect(safeUrl('https://a.org/x')).toBe('https://a.org/x')
    expect(safeUrl('www.kittennursery.net')).toBe('https://www.kittennursery.net/')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('mailto:a@b.org')).toBeNull()
    expect(safeUrl('not a url')).toBeNull()
    expect(safeUrl('')).toBeNull()
    expect(safeUrl(null)).toBeNull()
  })
})

describe('searchFilters', () => {
  const now = new Date('2026-10-12T00:00:00Z')

  it('always limits results to recently-updated listings', () => {
    const f = searchFilters({ lat: 37.7, lon: -97.3, radius: 50, now })
    const fresh = f.find(x => x.fieldName === 'animals.updatedDate')!
    expect(fresh.operation).toBe('greaterthan')
    expect(new Date(fresh.criteria as string).getTime()).toBe(now.getTime() - FRESH_DAYS * 86_400_000)
  })

  it('adds a bounding box that contains the full radius', () => {
    const f = searchFilters({ lat: 37.7, lon: -97.3, radius: 69, now })
    const get = (field: string, op: string) => f.find(x => x.fieldName === field && x.operation === op)!.criteria as number
    expect(get('orgs.lat', 'greaterthan')).toBeCloseTo(36.7)
    expect(get('orgs.lat', 'lessthan')).toBeCloseTo(38.7)
    expect(get('orgs.lon', 'greaterthan')).toBeLessThan(-98.3)  // longitude degrees are shorter at this latitude
    expect(get('orgs.lon', 'lessthan')).toBeGreaterThan(-96.3)
  })

  it('omits the box for a nationwide search and adds a species filter when given', () => {
    const f = searchFilters({ lat: 37.7, lon: -97.3, radius: NATIONWIDE_RADIUS, species: 'Cat', now })
    expect(f.some(x => x.fieldName.startsWith('orgs.'))).toBe(false)
    expect(f).toContainEqual({ fieldName: 'species.singular', operation: 'equal', criteria: 'Cat' })
  })
})

describe('adopter preferences', () => {
  const base = { size: 'Small', energy: 'High', breed: 'Beagle Mix', goodWith: { kids: true, dogs: null, cats: false } }
  const none = { size: [], energy: [], breeds: [], kids: false, dogs: false, cats: false }

  it('round-trips through query params', () => {
    const params = new URLSearchParams(prefsToParams({
      species: [], age: [], housing: null, size: ['Small', 'Medium'], energy: ['Very High'],
      breeds: ['Beagle', 'Pit Bull, Mix'], good_with_kids: true, good_with_dogs: null, good_with_cats: true,
    }))
    expect(parsePrefs(params)).toEqual({
      size: ['Small', 'Medium'], energy: ['Very High'], breeds: ['Beagle', 'Pit Bull, Mix'], kids: true, dogs: false, cats: true,
    })
  })

  it('no preferences matches everything', () => {
    expect(matchesPrefs(base, none)).toBe(true)
  })

  it('size, energy, and breed must match when the source states them', () => {
    expect(matchesPrefs(base, { ...none, size: ['Large'] })).toBe(false)
    expect(matchesPrefs(base, { ...none, size: ['Small'] })).toBe(true)
    expect(matchesPrefs(base, { ...none, energy: ['Very High'] })).toBe(true)
    expect(matchesPrefs(base, { ...none, energy: ['Low'] })).toBe(false)
    expect(matchesPrefs(base, { ...none, breeds: ['beagle'] })).toBe(true)
    expect(matchesPrefs(base, { ...none, breeds: ['Poodle'] })).toBe(false)
  })

  it('"must be good with" requires an explicit yes from the source', () => {
    expect(matchesPrefs(base, { ...none, kids: true })).toBe(true)
    expect(matchesPrefs(base, { ...none, dogs: true })).toBe(false)   // unknown
    expect(matchesPrefs(base, { ...none, cats: true })).toBe(false)   // explicit no
  })
})
