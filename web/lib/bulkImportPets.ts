import type { PetSpecies } from '@/types'

// Column headers the template ships with — order doesn't matter on import,
// only that these names (case/spacing-insensitive) are present.
export const BULK_IMPORT_HEADERS = [
  'name', 'species', 'breed', 'age', 'gender', 'size',
  'description', 'fee', 'traits', 'photo_urls',
] as const

export interface BulkImportRow {
  name: string
  species: PetSpecies
  breed: string | null
  age: string | null
  gender: 'Male' | 'Female' | 'Unknown'
  size: 'Small' | 'Medium' | 'Large' | 'XL' | null
  description: string | null
  fee: number | null // cents
  traits: string[]
  photos: string[]
}

export interface BulkImportError {
  row: number // 1-indexed against the data rows (header excluded), for display as "row 3"
  name: string // best-effort, for identifying the row to the user even if name itself is the problem
  message: string
}

export interface BulkImportResult {
  valid: BulkImportRow[]
  errors: BulkImportError[]
}

const SPECIES_SYNONYMS: Record<string, PetSpecies> = {
  dog: 'dog', dogs: 'dog', puppy: 'dog', puppies: 'dog', canine: 'dog',
  cat: 'cat', cats: 'cat', kitten: 'cat', kittens: 'cat', feline: 'cat',
  rabbit: 'rabbit', rabbits: 'rabbit', bunny: 'rabbit', bunnies: 'rabbit',
  bird: 'bird', birds: 'bird', parrot: 'bird',
  reptile: 'reptile', reptiles: 'reptile', lizard: 'reptile', snake: 'reptile', turtle: 'reptile', tortoise: 'reptile',
  small_animal: 'small_animal', 'small animal': 'small_animal', hamster: 'small_animal',
  'guinea pig': 'small_animal', guinea_pig: 'small_animal', ferret: 'small_animal', gerbil: 'small_animal', mouse: 'small_animal', rat: 'small_animal',
  farm: 'farm', 'farm animal': 'farm', farm_animal: 'farm', horse: 'farm', goat: 'farm', pig: 'farm', chicken: 'farm', sheep: 'farm', cow: 'farm',
  other: 'other',
}

const GENDER_SYNONYMS: Record<string, 'Male' | 'Female' | 'Unknown'> = {
  m: 'Male', male: 'Male', boy: 'Male',
  f: 'Female', female: 'Female', girl: 'Female',
  u: 'Unknown', unk: 'Unknown', unknown: 'Unknown', '': 'Unknown',
}

const SIZE_SYNONYMS: Record<string, 'Small' | 'Medium' | 'Large' | 'XL'> = {
  s: 'Small', sm: 'Small', small: 'Small',
  m: 'Medium', med: 'Medium', medium: 'Medium',
  l: 'Large', lg: 'Large', large: 'Large',
  xl: 'XL', 'x-large': 'XL', xlarge: 'XL', 'extra large': 'XL', extra_large: 'XL',
}

function norm(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase()
}

// A row is treated as blank filler (skipped, not an error) when every
// meaningful field is empty — spreadsheet exports often carry trailing rows.
function isBlankRow(row: Record<string, string>): boolean {
  return Object.values(row).every(v => norm(v) === '')
}

function splitList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function parseFee(raw: string | undefined): { value: number | null; error?: string } {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { value: null }
  const cleaned = trimmed.replace(/[$,]/g, '')
  const dollars = parseFloat(cleaned)
  if (Number.isNaN(dollars) || dollars < 0) return { value: null, error: `Fee "${raw}" isn't a valid amount` }
  return { value: Math.round(dollars * 100) }
}

// Rows come pre-split into cells by the caller (Papa Parse with header:true,
// keys lowercased/trimmed) — kept separate from that so this logic is
// testable without touching an actual file.
export function parseBulkImportRows(rows: Record<string, string>[]): BulkImportResult {
  const valid: BulkImportRow[] = []
  const errors: BulkImportError[] = []

  rows.forEach((row, i) => {
    if (isBlankRow(row)) return
    const rowNum = i + 1
    const name = (row.name ?? '').trim()
    const displayName = name || `(row ${rowNum})`

    if (!name) {
      errors.push({ row: rowNum, name: displayName, message: 'Name is required' })
      return
    }

    const speciesRaw = norm(row.species)
    const species = SPECIES_SYNONYMS[speciesRaw]
    if (!species) {
      errors.push({
        row: rowNum, name: displayName,
        message: speciesRaw
          ? `Species "${row.species}" isn't recognized — use dog, cat, rabbit, bird, reptile, small_animal, farm, or other`
          : 'Species is required',
      })
      return
    }

    const genderRaw = norm(row.gender)
    const gender = GENDER_SYNONYMS[genderRaw]
    if (gender === undefined) {
      errors.push({ row: rowNum, name: displayName, message: `Gender "${row.gender}" isn't recognized — use Male, Female, or Unknown` })
      return
    }

    const sizeRaw = norm(row.size)
    let size: BulkImportRow['size'] = null
    if (sizeRaw) {
      const mapped = SIZE_SYNONYMS[sizeRaw]
      if (!mapped) {
        errors.push({ row: rowNum, name: displayName, message: `Size "${row.size}" isn't recognized — use Small, Medium, Large, or XL` })
        return
      }
      size = mapped
    }

    const { value: fee, error: feeError } = parseFee(row.fee)
    if (feeError) {
      errors.push({ row: rowNum, name: displayName, message: feeError })
      return
    }

    valid.push({
      name,
      species,
      breed: row.breed?.trim() || null,
      age: row.age?.trim() || null,
      gender,
      size,
      description: row.description?.trim() || null,
      fee,
      traits: splitList(row.traits),
      photos: splitList(row.photo_urls),
    })
  })

  return { valid, errors }
}
