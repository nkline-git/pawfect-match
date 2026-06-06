// ── Pet preferences (from onboarding quiz) ───────────────────────
export interface PetPreferences {
  species:         string[]        // e.g. ['dog','cat']
  size:            string[]        // e.g. ['Small','Medium']
  age:             string[]        // e.g. ['Young','Adult']
  energy:          string[]        // e.g. ['Medium','High']
  good_with_kids:  boolean | null
  good_with_dogs:  boolean | null
  good_with_cats:  boolean | null
  housing:         string | null   // 'apartment'|'house'|'farm'|null
}

// ── User / Adopter profile ────────────────────────────────────────
export interface Profile {
  id: string
  first_name: string
  last_name_initial: string | null
  city: string
  bio: string | null
  avatar: string
  lifestyle: string[]
  time_availability: string | null
  notification_prefs: NotificationPrefs
  preferences: PetPreferences | null
  role: 'user' | 'admin' | 'moderator'
  created_at: string
  updated_at: string
}

export interface NotificationPrefs {
  matches: boolean
  events: boolean
  community: boolean
  deals: boolean
  search_radius?: number   // miles; default 100
}

// ── Rescue / Shelter ─────────────────────────────────────────────
export interface Rescue {
  id: string
  user_id: string
  name: string
  city: string
  mission: string | null
  logo: string
  banner_gradient: string
  phone: string | null
  email: string | null
  website: string | null
  hours: string | null
  appointment_required: boolean
  animal_types: string[]
  requirements: RescueRequirements
  fee_range: string | null
  requirement_notes: string | null
  ein: string
  verified: boolean
  verified_at: string | null
  stats: RescueStats
  created_at: string
  updated_at: string
}

export interface RescueRequirements {
  application: boolean
  homeVisit: boolean
  refCheck: boolean
  trial: boolean
}

export interface RescueStats {
  animals: number
  placed: number
  apps: number
}

// ── Pet ──────────────────────────────────────────────────────────
export interface Pet {
  id: string
  rescue_id: string
  name: string
  species: PetSpecies
  breed: string | null
  age: string | null
  gender: 'Male' | 'Female' | 'Unknown'
  size: 'Small' | 'Medium' | 'Large' | 'XL' | null
  energy: 'Low' | 'Medium' | 'High' | 'Very High' | null
  traits: string[]
  description: string | null
  fee: number | null        // in cents
  photos: string[]          // Supabase Storage URLs
  status: PetStatus
  good_with: string[]
  created_at: string
  updated_at: string
  // joined
  rescue?: Pick<Rescue, 'id' | 'name' | 'city' | 'logo'>
}

export type PetSpecies = 'dog' | 'cat' | 'rabbit' | 'bird' | 'reptile' | 'small_animal' | 'farm' | 'other'
export type PetStatus = 'available' | 'pending' | 'adopted'

// ── Saved pets ───────────────────────────────────────────────────
export interface SavedPet {
  user_id: string
  pet_id: string
  created_at: string
  pet?: Pet
}

// ── Application ──────────────────────────────────────────────────
export interface Application {
  id: string
  user_id: string
  pet_id: string
  rescue_id: string
  status: ApplicationStatus
  message: string | null
  created_at: string
  updated_at: string
  // joined
  pet?: Pet
  profile?: Profile
}

export type ApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected'

// ── Event ────────────────────────────────────────────────────────
export type EventType = 'adoption_event' | 'fundraiser' | 'volunteer_day' | 'training' | 'meetup' | 'other'
export type EventStatus = 'active' | 'cancelled' | 'completed'

export interface PawfectEvent {
  id: string
  user_id: string
  rescue_id: string | null
  title: string
  description: string | null
  event_type: EventType
  location: string | null
  starts_at: string
  ends_at: string | null
  image_url: string | null
  status: EventStatus
  hidden: boolean
  created_at: string
  updated_at: string
  // joined
  rescue?: Pick<Rescue, 'id' | 'name' | 'logo' | 'city'> | null
  profile?: Pick<Profile, 'first_name' | 'avatar'> | null
}

// ── Report ───────────────────────────────────────────────────────
export type ReportContentType = 'post' | 'event' | 'pet' | 'user' | 'rescue'
export type ReportReason = 'spam' | 'scam' | 'inappropriate' | 'false_info' | 'animal_safety' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned'

export interface Report {
  id: string
  reporter_id: string
  content_type: ReportContentType
  content_id: string
  reason: ReportReason
  notes: string | null
  status: ReportStatus
  reviewer_id: string | null
  created_at: string
  updated_at: string
}

// ── Pet Store ─────────────────────────────────────────────────────
export interface PetStore {
  id: string
  user_id: string
  name: string
  city: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  logo: string
  cover_color: string
  specialties: string[]
  hours: string | null
  instagram: string | null
  facebook: string | null
  verified: boolean
  created_at: string
  updated_at: string
}

// ── API helpers ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
