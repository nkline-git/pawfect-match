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

export const POPULAR_BREEDS = [
  // Dogs
  'Golden Retriever', 'Labrador', 'German Shepherd', 'French Bulldog',
  'Bulldog', 'Beagle', 'Husky', 'Poodle', 'Chihuahua', 'Dachshund',
  'Border Collie', 'Shih Tzu', 'Corgi', 'Poodle Mix', 'Shepherd Mix',
  // Cats
  'Tabby', 'Siamese', 'Maine Coon', 'Persian', 'Ragdoll',
  'Bengal', 'British Shorthair', 'Domestic Shorthair', 'Domestic Longhair',
]
