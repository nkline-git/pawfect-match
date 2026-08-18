import { describe, it, expect } from 'vitest'
import { haversineMiles, applyPreferences, localPetToUnified } from './matching'
import type { Pet, PetPreferences } from '@/types'

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'pet-1',
    rescue_id: 'rescue-1',
    owner_id: null,
    contact_email: null,
    rehome_reason: null,
    city: null,
    lat: null,
    lon: null,
    name: 'Fido',
    species: 'dog',
    breed: 'Golden Retriever',
    age: 'Adult',
    gender: 'Male',
    size: 'Large',
    energy: 'High',
    traits: ['Friendly'],
    description: null,
    fee: null,
    photos: [],
    status: 'available',
    good_with: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePrefs(overrides: Partial<PetPreferences> = {}): PetPreferences {
  return {
    species: [],
    breeds: [],
    size: [],
    age: [],
    energy: [],
    good_with_kids: null,
    good_with_dogs: null,
    good_with_cats: null,
    housing: null,
    ...overrides,
  }
}

describe('haversineMiles', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineMiles(39.0, -98.0, 39.0, -98.0)).toBeCloseTo(0, 5)
  })

  it('computes a known distance (Wichita, KS -> Kansas City, MO ~ 180mi)', () => {
    const d = haversineMiles(37.6872, -97.3301, 39.0997, -94.5786)
    expect(d).toBeGreaterThan(170)
    expect(d).toBeLessThan(200)
  })

  it('is symmetric', () => {
    const a = haversineMiles(34.05, -118.24, 40.71, -74.00)
    const b = haversineMiles(40.71, -74.00, 34.05, -118.24)
    expect(a).toBeCloseTo(b, 10)
  })
})

describe('applyPreferences', () => {
  const pets = [
    makePet({ id: 'dog-large', species: 'dog', size: 'Large', breed: 'Poodle Mix', good_with: ['Kids'] }),
    makePet({ id: 'cat-small', species: 'cat', size: 'Small', breed: 'Tabby', good_with: ['Cats'] }),
    makePet({ id: 'dog-small', species: 'dog', size: 'Small', breed: 'Chihuahua', good_with: ['Dogs', 'Kids'] }),
  ]

  it('returns all pets when prefs is null', () => {
    expect(applyPreferences(pets, null)).toEqual(pets)
  })

  it('filters by species', () => {
    const result = applyPreferences(pets, makePrefs({ species: ['cat'] }))
    expect(result.map(p => p.id)).toEqual(['cat-small'])
  })

  it('filters by size', () => {
    const result = applyPreferences(pets, makePrefs({ size: ['Small'] }))
    expect(result.map(p => p.id).sort()).toEqual(['cat-small', 'dog-small'])
  })

  it('matches breed case-insensitively and partially ("Poodle" matches "Poodle Mix")', () => {
    const result = applyPreferences(pets, makePrefs({ breeds: ['poodle'] }))
    expect(result.map(p => p.id)).toEqual(['dog-large'])
  })

  it('requires good_with_kids when set to true', () => {
    const result = applyPreferences(pets, makePrefs({ good_with_kids: true }))
    expect(result.map(p => p.id).sort()).toEqual(['dog-large', 'dog-small'])
  })

  it('combines multiple filters (AND semantics)', () => {
    const result = applyPreferences(pets, makePrefs({ species: ['dog'], size: ['Small'] }))
    expect(result.map(p => p.id)).toEqual(['dog-small'])
  })

  it('does not exclude pets with no breed set when a breed filter is active', () => {
    const noBreed = makePet({ id: 'no-breed', breed: null })
    const result = applyPreferences([noBreed], makePrefs({ breeds: ['poodle'] }))
    // breed check only applies `if (... && p.breed)` — pets without a breed pass through
    expect(result.map(p => p.id)).toEqual(['no-breed'])
  })
})

describe('localPetToUnified', () => {
  it('maps a rescue pet with joined rescue info', () => {
    const pet = makePet({
      rescue: { id: 'r1', name: 'Heartland Paws', city: 'Wichita, KS', logo: '🏠', lat: 37.6, lon: -97.3 },
    })
    const unified = localPetToUnified(pet)
    expect(unified.orgName).toBe('Heartland Paws')
    expect(unified.city).toBe('Wichita, KS')
    expect(unified.isLocal).toBe(true)
    expect(unified.rescueLat).toBe(37.6)
    expect(unified.rescueLon).toBe(-97.3)
    expect(unified.orgEmail).toBeNull()
  })

  it('marks owner-rehomed pets distinctly and surfaces contact email', () => {
    const pet = makePet({
      rescue_id: null,
      owner_id: 'user-1',
      contact_email: 'owner@example.com',
      rehome_reason: 'Moving overseas',
      description: null,
      city: 'San Diego, CA',
    })
    const unified = localPetToUnified(pet)
    expect(unified.orgName).toBe('💛 Owner rehoming')
    expect(unified.orgEmail).toBe('owner@example.com')
    expect(unified.description).toBe('Looking for a new home: Moving overseas')
    expect(unified.city).toBe('San Diego, CA')
  })

  it('prefers an explicit description over the rehome-reason fallback', () => {
    const pet = makePet({
      rescue_id: null,
      owner_id: 'user-1',
      rehome_reason: 'Moving overseas',
      description: 'Loves belly rubs.',
    })
    expect(localPetToUnified(pet).description).toBe('Loves belly rubs.')
  })

  it('merges good_with into personality tags without duplicating existing traits', () => {
    const pet = makePet({ traits: ['Friendly', 'Good with kids'], good_with: ['Kids', 'Dogs'] })
    const unified = localPetToUnified(pet)
    expect(unified.tags).toEqual(['Friendly', 'Good with kids', 'Dog-friendly'])
  })

  it('falls back to the first photo and an empty photos array', () => {
    const pet = makePet({ photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] })
    const unified = localPetToUnified(pet)
    expect(unified.photo).toBe('https://example.com/a.jpg')
    expect(unified.photos).toHaveLength(2)

    const noPhotos = localPetToUnified(makePet({ photos: [] }))
    expect(noPhotos.photo).toBeNull()
  })
})
