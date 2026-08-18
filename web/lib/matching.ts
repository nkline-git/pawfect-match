import type { Pet, PetPreferences, UnifiedPet } from '@/types'

// Haversine distance in miles (client-side, for local pet filtering)
export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function applyPreferences(pets: Pet[], prefs: PetPreferences | null): Pet[] {
  if (!prefs) return pets
  return pets.filter(p => {
    if (prefs.species.length > 0 && !prefs.species.includes(p.species)) return false
    // Breed: case-insensitive partial match (e.g. "Poodle" matches "Poodle Mix")
    if (prefs.breeds && prefs.breeds.length > 0 && p.breed) {
      const breedLower = p.breed.toLowerCase()
      if (!prefs.breeds.some(b => breedLower.includes(b.toLowerCase()) || b.toLowerCase().includes(breedLower))) return false
    }
    if (prefs.size.length > 0 && p.size && !prefs.size.includes(p.size)) return false
    if (prefs.energy.length > 0 && p.energy && !prefs.energy.includes(p.energy)) return false
    if (prefs.good_with_kids === true && !p.good_with.includes('Kids')) return false
    if (prefs.good_with_dogs === true && !p.good_with.includes('Dogs')) return false
    if (prefs.good_with_cats === true && !p.good_with.includes('Cats')) return false
    return true
  })
}

export function localPetToUnified(pet: Pet): UnifiedPet {
  // Surface good_with as personality tags so cards + match reasons pick them up
  const goodWithTags: string[] = []
  if (pet.good_with.includes('Kids')) goodWithTags.push('Good with kids')
  if (pet.good_with.includes('Dogs')) goodWithTags.push('Dog-friendly')
  if (pet.good_with.includes('Cats')) goodWithTags.push('Cat-friendly')
  const mergedTags = [...pet.traits, ...goodWithTags.filter(t => !pet.traits.includes(t))]
  const isRehoming = !pet.rescue_id && !!pet.owner_id
  return {
    id:          pet.id,
    name:        pet.name,
    type:        pet.species,
    breed:       pet.breed,
    age:         pet.age,
    gender:      pet.gender,
    size:        pet.size,
    description: pet.description
      ?? (isRehoming && pet.rehome_reason ? `Looking for a new home: ${pet.rehome_reason}` : null),
    photo:       pet.photos[0] ?? null,
    photos:      pet.photos ?? [],
    url:         `/pets/${pet.id}`,
    orgUrl:      null,
    orgEmail:    isRehoming ? (pet.contact_email ?? null) : null,
    orgPhone:    null,
    city:        pet.rescue?.city ?? pet.city ?? 'Nearby',
    orgName:     pet.rescue?.name ?? (isRehoming ? '💛 Owner rehoming' : 'Local Rescue'),
    tags:        mergedTags,
    isLocal:     true,
    rescueLat:   pet.rescue?.lat ?? pet.lat ?? null,
    rescueLon:   pet.rescue?.lon ?? pet.lon ?? null,
  }
}
