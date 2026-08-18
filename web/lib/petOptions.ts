// Shared option lists for pet-preference UI (the onboarding wizard, the
// profile page's breed field, and the browse page's quick Filters panel all
// need the same vocabulary — kept here once so they can't drift apart).

export const SIZE_OPTIONS = [
  { value: 'Small',  label: 'Small',  sub: '< 25 lbs'   },
  { value: 'Medium', label: 'Medium', sub: '25–60 lbs'  },
  { value: 'Large',  label: 'Large',  sub: '60–90 lbs'  },
  { value: 'XL',     label: 'XL',     sub: '90+ lbs'    },
] as const

export const ENERGY_OPTIONS = [
  { value: 'Low',       label: 'Couch companion', sub: 'Loves naps'         },
  { value: 'Medium',    label: 'Daily walks',     sub: 'Active but chill'   },
  { value: 'High',      label: 'Adventure buddy', sub: 'Always on the go'   },
  { value: 'Very High', label: 'Extreme athlete', sub: 'Needs lots of room' },
] as const

export const HOUSING_OPTIONS = [
  { value: 'apartment', label: 'Apartment'       },
  { value: 'house',     label: 'House with yard' },
  { value: 'farm',      label: 'Farm / rural'    },
] as const

export const GOOD_WITH_OPTIONS = [
  { field: 'good_with_kids' as const, label: 'Kids'       },
  { field: 'good_with_dogs' as const, label: 'Other dogs' },
  { field: 'good_with_cats' as const, label: 'Other cats' },
] as const

// Small curated subset shown as one-tap quick-pick chips before the user
// types anything.
export const POPULAR_BREEDS = [
  // Dogs
  'Golden Retriever', 'Labrador', 'German Shepherd', 'French Bulldog',
  'Bulldog', 'Beagle', 'Husky', 'Poodle', 'Chihuahua', 'Dachshund',
  'Border Collie', 'Shih Tzu', 'Corgi', 'Poodle Mix', 'Shepherd Mix',
  // Cats
  'Tabby', 'Siamese', 'Maine Coon', 'Persian', 'Ragdoll',
  'Bengal', 'British Shorthair', 'Domestic Shorthair', 'Domestic Longhair',
]

// Full breed vocabulary for autocomplete — catches typos/misspellings as
// the user types instead of only offering the 24 breeds above. Static list
// (no external API) so suggestions are instant and never rate-limited.
export const ALL_BREEDS = [
  // ── Dogs (AKC-recognized + common shelter breeds) ──────────────────
  'Affenpinscher', 'Afghan Hound', 'Airedale Terrier', 'Akita',
  'Alaskan Malamute', 'American Bulldog', 'American Bully',
  'American English Coonhound', 'American Eskimo Dog',
  'American Foxhound', 'American Pit Bull Terrier',
  'American Staffordshire Terrier', 'American Water Spaniel',
  'Anatolian Shepherd Dog', 'Australian Cattle Dog', 'Australian Shepherd',
  'Australian Terrier', 'Basenji', 'Basset Hound', 'Beagle',
  'Bearded Collie', 'Beauceron', 'Bedlington Terrier', 'Belgian Malinois',
  'Belgian Sheepdog', 'Belgian Tervuren', 'Bernese Mountain Dog',
  'Bichon Frise', 'Black and Tan Coonhound', 'Black Mouth Cur',
  'Bloodhound', 'Bluetick Coonhound', 'Boerboel', 'Border Collie',
  'Border Terrier', 'Borzoi', 'Boston Terrier', 'Bouvier des Flandres',
  'Boxer', 'Boykin Spaniel', 'Briard', 'Brittany', 'Brussels Griffon',
  'Bull Terrier', 'Bulldog', 'Bullmastiff', 'Cairn Terrier',
  'Canaan Dog', 'Cane Corso', 'Cardigan Welsh Corgi',
  'Catahoula Leopard Dog', 'Cavalier King Charles Spaniel',
  'Chesapeake Bay Retriever', 'Chihuahua', 'Chinese Crested',
  'Chinese Shar-Pei', 'Chinook', 'Chow Chow', 'Clumber Spaniel',
  'Cockapoo', 'Cocker Spaniel', 'Collie', 'Coonhound', 'Corgi',
  'Curly-Coated Retriever', 'Dachshund', 'Dalmatian',
  'Doberman Pinscher', 'Dogo Argentino', 'Dogue de Bordeaux',
  'Dutch Shepherd', 'English Bulldog', 'English Cocker Spaniel',
  'English Foxhound', 'English Pointer', 'English Setter',
  'English Springer Spaniel', 'English Toy Spaniel',
  'Entlebucher Mountain Dog', 'Field Spaniel', 'Finnish Lapphund',
  'Flat-Coated Retriever', 'Fox Terrier', 'French Bulldog',
  'German Pinscher', 'German Shepherd', 'German Shorthaired Pointer',
  'German Wirehaired Pointer', 'Giant Schnauzer', 'Glen of Imaal Terrier',
  'Golden Retriever', 'Goldendoodle', 'Gordon Setter',
  'Great Dane', 'Great Pyrenees', 'Greater Swiss Mountain Dog',
  'Greyhound', 'Harrier', 'Havanese', 'Ibizan Hound',
  'Icelandic Sheepdog', 'Irish Setter', 'Irish Terrier',
  'Irish Water Spaniel', 'Irish Wolfhound', 'Italian Greyhound',
  'Jack Russell Terrier', 'Japanese Chin', 'Keeshond',
  'Kerry Blue Terrier', 'King Charles Spaniel', 'Komondor', 'Kuvasz',
  'Labradoodle', 'Labrador Retriever', 'Lakeland Terrier',
  'Leonberger', 'Lhasa Apso', 'Lowchen', 'Maltese', 'Manchester Terrier',
  'Mastiff', 'Miniature American Shepherd', 'Miniature Bull Terrier',
  'Miniature Pinscher', 'Miniature Schnauzer', 'Mixed Breed',
  'Neapolitan Mastiff', 'Newfoundland', 'Norfolk Terrier',
  'Norwegian Buhund', 'Norwegian Elkhound', 'Norwegian Lundehund',
  'Norwich Terrier', 'Nova Scotia Duck Tolling Retriever',
  'Old English Sheepdog', 'Otterhound', 'Papillon', 'Parson Russell Terrier',
  'Pekingese', 'Pembroke Welsh Corgi', 'Petit Basset Griffon Vendeen',
  'Pharaoh Hound', 'Pit Bull', 'Plott Hound', 'Pointer', 'Pomeranian',
  'Poodle', 'Poodle Mix', 'Portuguese Podengo', 'Portuguese Water Dog', 'Presa Canario',
  'Pug', 'Puggle', 'Pumi', 'Pyrenean Shepherd', 'Rat Terrier',
  'Redbone Coonhound', 'Rhodesian Ridgeback', 'Rottweiler',
  'Saint Bernard', 'Saluki', 'Samoyed', 'Schipperke', 'Schnauzer',
  'Scottish Deerhound', 'Scottish Terrier', 'Sealyham Terrier',
  'Shetland Sheepdog', 'Shiba Inu', 'Shih Tzu', 'Shepherd Mix',
  'Siberian Husky', 'Silky Terrier', 'Skye Terrier',
  'Sloughi', 'Soft Coated Wheaten Terrier', 'Spinone Italiano',
  'Staffordshire Bull Terrier', 'Standard Schnauzer',
  'Sussex Spaniel', 'Swedish Vallhund', 'Tibetan Mastiff',
  'Tibetan Spaniel', 'Tibetan Terrier', 'Toy Fox Terrier',
  'Treeing Walker Coonhound', 'Vizsla', 'Weimaraner',
  'Welsh Springer Spaniel', 'Welsh Terrier', 'West Highland White Terrier',
  'Whippet', 'Wire Fox Terrier', 'Wirehaired Pointing Griffon',
  'Xoloitzcuintli', 'Yorkshire Terrier',

  // ── Cats (CFA/TICA-recognized + common shelter breeds) ─────────────
  'Abyssinian', 'American Bobtail', 'American Curl', 'American Shorthair',
  'American Wirehair', 'Balinese', 'Bengal', 'Birman', 'Bombay',
  'British Longhair', 'British Shorthair', 'Burmese', 'Burmilla',
  'Calico', 'Chartreux', 'Chausie', 'Cornish Rex', 'Devon Rex',
  'Domestic Longhair', 'Domestic Mediumhair', 'Domestic Shorthair',
  'Egyptian Mau', 'Exotic Shorthair', 'Havana Brown', 'Himalayan',
  'Japanese Bobtail', 'Javanese', 'Korat', 'LaPerm', 'Maine Coon',
  'Manx', 'Munchkin', 'Nebelung', 'Norwegian Forest Cat', 'Ocicat',
  'Oriental Shorthair', 'Persian', 'Pixie-bob', 'Ragamuffin', 'Ragdoll',
  'Russian Blue', 'Savannah', 'Scottish Fold', 'Selkirk Rex', 'Siamese',
  'Siberian', 'Singapura', 'Snowshoe', 'Sphynx', 'Tabby', 'Tonkinese',
  'Turkish Angora', 'Turkish Van',
]

// Ranks breed names starting with the query above ones that just contain it
// ("Corgi" before "Cardigan Welsh Corgi" when typing "cor"), then A–Z.
// Excludes breeds already picked and caps results for a compact dropdown.
export function matchBreeds(query: string, exclude: string[] = [], limit = 6): string[] {
  const q = query.trim().toLowerCase()
  if (q.length < 1) return []
  return ALL_BREEDS
    .filter(b => !exclude.includes(b) && b.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q)
      const bStarts = b.toLowerCase().startsWith(q)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.localeCompare(b)
    })
    .slice(0, limit)
}
