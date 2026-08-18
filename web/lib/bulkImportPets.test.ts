import { describe, it, expect } from 'vitest'
import { parseBulkImportRows } from './bulkImportPets'

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    name: 'Buddy', species: 'dog', breed: 'Golden Retriever', age: '2 yrs',
    gender: 'Male', size: 'Large', description: 'Loves fetch.', fee: '150',
    traits: 'Friendly, House-trained', photo_urls: 'https://example.com/a.jpg',
    ...overrides,
  }
}

describe('parseBulkImportRows', () => {
  it('parses a fully-populated valid row', () => {
    const { valid, errors } = parseBulkImportRows([row()])
    expect(errors).toEqual([])
    expect(valid).toEqual([{
      name: 'Buddy', species: 'dog', breed: 'Golden Retriever', age: '2 yrs',
      gender: 'Male', size: 'Large', description: 'Loves fetch.', fee: 15000,
      traits: ['Friendly', 'House-trained'], photos: ['https://example.com/a.jpg'],
    }])
  })

  it('accepts a minimal row with only name and species', () => {
    const { valid, errors } = parseBulkImportRows([row({
      breed: '', age: '', gender: '', size: '', description: '', fee: '', traits: '', photo_urls: '',
    })])
    expect(errors).toEqual([])
    expect(valid).toEqual([{
      name: 'Buddy', species: 'dog', breed: null, age: null,
      gender: 'Unknown', size: null, description: null, fee: null,
      traits: [], photos: [],
    }])
  })

  it('skips fully blank rows without an error', () => {
    const { valid, errors } = parseBulkImportRows([
      { name: '', species: '', breed: '', age: '', gender: '', size: '', description: '', fee: '', traits: '', photo_urls: '' },
    ])
    expect(valid).toEqual([])
    expect(errors).toEqual([])
  })

  it('requires a name', () => {
    const { valid, errors } = parseBulkImportRows([row({ name: '' })])
    expect(valid).toEqual([])
    expect(errors).toEqual([{ row: 1, name: '(row 1)', message: 'Name is required' }])
  })

  it('requires a recognizable species', () => {
    const { errors } = parseBulkImportRows([row({ species: '' })])
    expect(errors[0].message).toBe('Species is required')

    const { errors: errors2 } = parseBulkImportRows([row({ species: 'dinosaur' })])
    expect(errors2[0].message).toMatch(/isn't recognized/)
  })

  it.each([
    ['Dog', 'dog'], ['DOGS', 'dog'], ['puppy', 'dog'],
    ['cat', 'cat'], ['Kittens', 'cat'],
    ['bunny', 'rabbit'], ['guinea pig', 'small_animal'], ['Horse', 'farm'],
  ])('normalizes species synonym %s -> %s', (input, expected) => {
    const { valid, errors } = parseBulkImportRows([row({ species: input })])
    expect(errors).toEqual([])
    expect(valid[0].species).toBe(expected)
  })

  it.each([
    ['M', 'Male'], ['female', 'Female'], ['Girl', 'Female'], ['', 'Unknown'], ['unk', 'Unknown'],
  ])('normalizes gender synonym %s -> %s', (input, expected) => {
    const { valid, errors } = parseBulkImportRows([row({ gender: input })])
    expect(errors).toEqual([])
    expect(valid[0].gender).toBe(expected)
  })

  it('rejects an unrecognized gender', () => {
    const { errors } = parseBulkImportRows([row({ gender: 'nonbinary-cat' })])
    expect(errors[0].message).toMatch(/isn't recognized/)
  })

  it.each([
    ['sm', 'Small'], ['MED', 'Medium'], ['lg', 'Large'], ['x-large', 'XL'],
  ])('normalizes size synonym %s -> %s', (input, expected) => {
    const { valid, errors } = parseBulkImportRows([row({ size: input })])
    expect(errors).toEqual([])
    expect(valid[0].size).toBe(expected)
  })

  it('rejects an unrecognized size but leaves it optional when blank', () => {
    const { errors } = parseBulkImportRows([row({ size: 'gigantic' })])
    expect(errors[0].message).toMatch(/isn't recognized/)

    const { valid, errors: errors2 } = parseBulkImportRows([row({ size: '' })])
    expect(errors2).toEqual([])
    expect(valid[0].size).toBeNull()
  })

  it('parses a dollar fee into cents, stripping $ and commas', () => {
    const { valid } = parseBulkImportRows([row({ fee: '$1,250.50' })])
    expect(valid[0].fee).toBe(125050)
  })

  it('rejects a non-numeric fee', () => {
    const { errors } = parseBulkImportRows([row({ fee: 'free-ish' })])
    expect(errors[0].message).toMatch(/valid amount/)
  })

  it('splits traits and photo_urls on commas and trims whitespace', () => {
    const { valid } = parseBulkImportRows([row({
      traits: ' Friendly ,Cuddly,  Good with kids ',
      photo_urls: 'https://a.com/1.jpg, https://a.com/2.jpg',
    })])
    expect(valid[0].traits).toEqual(['Friendly', 'Cuddly', 'Good with kids'])
    expect(valid[0].photos).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg'])
  })

  it('processes multiple rows independently, collecting valid rows and errors separately', () => {
    const { valid, errors } = parseBulkImportRows([
      row({ name: 'Buddy' }),
      row({ name: '' }),
      row({ name: 'Milo', species: 'cat' }),
      row({ name: 'Bad Size', size: 'huge' }),
    ])
    expect(valid.map(v => v.name)).toEqual(['Buddy', 'Milo'])
    expect(errors).toHaveLength(2)
    expect(errors[0].row).toBe(2)
    expect(errors[1].row).toBe(4)
  })

  it('stops at the first validation problem per row rather than reporting duplicates', () => {
    const { errors } = parseBulkImportRows([row({ species: 'nope', gender: 'nope', size: 'nope' })])
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/Species/)
  })
})
