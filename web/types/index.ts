// ── Pet preferences (from onboarding quiz) ───────────────────────
export interface PetPreferences {
  species:         string[]        // e.g. ['dog','cat']
  breeds:          string[]        // e.g. ['Golden Retriever','Tabby']
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
  lat?: number | null   // geocoded from city (006 migration)
  lon?: number | null
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
  ein: string | null            // null = built page without EIN (draft until published)
  verified: boolean
  verified_at: string | null
  published?: boolean           // false = draft, hidden from adopters (011 migration)
  approval_requested_at?: string | null // set when a draft asks for manual review
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
  rescue_id: string | null       // null for owner-rehomed pets (008)
  owner_id?: string | null       // set for owner-rehomed pets
  contact_email?: string | null  // rehoming contact
  rehome_reason?: string | null
  city?: string | null           // rehoming pets carry their own location
  lat?: number | null
  lon?: number | null
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
  rescue?: Pick<Rescue, 'id' | 'name' | 'city' | 'logo' | 'lat' | 'lon'>
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
  city: string | null   // null = online/home-based seller with no storefront location
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
  announcement?: string | null   // deal banner on public page (004 migration)
  featured?: boolean             // admin-toggled paid placement (014 migration)
  created_at: string
  updated_at: string
}

// ── Store products (mini storefront, 004 migration) ─────────────
export interface StoreProduct {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number | null       // cents; null = "ask in store"
  compare_at: number | null
  emoji: string
  photo_url: string | null
  category: 'food' | 'toys' | 'beds' | 'grooming' | 'health' | 'travel' | 'treats' | 'other'
  in_stock: boolean
  sort: number
  buy_url?: string | null   // where the seller actually sells this (Etsy, PayPal.me, etc.) — 014 migration
  clicks?: number           // "Buy" click count — 014 migration
  created_at: string
  updated_at: string
}

// ── Saved RescueGroups animal (persisted to localStorage) ────────
// Mirrors the key fields of UnifiedPet from app/page.tsx so the Saved
// page can render liked RG animals without a DB table.
export interface SavedRGAnimal {
  id:       string
  name:     string
  type:     string
  breed:    string | null
  age:      string | null
  gender:   string
  photo:    string | null
  orgName:  string
  orgUrl:   string | null
  orgEmail: string | null
  orgPhone: string | null
  city:     string
  savedAt:  string          // ISO timestamp
}

// Unified animal shape (local DB pets + RescueGroups animals) — the common
// currency of the browse feed, detail sheet, and Saved page
export interface UnifiedPet {
  id: string
  name: string
  type: string
  breed: string | null
  age: string | null
  gender: string
  size: string | null
  description: string | null
  photo: string | null
  photos: string[]
  url: string           // RescueGroups listing URL (for RG pets) or /pets/:id (local)
  orgUrl: string | null   // rescue's own website (if known)
  orgEmail: string | null // rescue contact email (if known)
  orgPhone: string | null // rescue contact phone (if known)
  city: string
  orgName: string
  tags: string[]
  isLocal: boolean
  distance?: number | null  // miles from search location (RG animals only)
  rescueLat?: number | null // local pets: rescue coords for distance filtering
  rescueLon?: number | null
}

// ── Sponsored ads (house ads, admin-curated — no ad network) ──────
export type AdPlacement = 'shop' | 'community' | 'saved'

export interface SponsoredAd {
  id: string
  title: string
  body: string | null
  emoji: string
  image_url: string | null
  cta_label: string
  cta_url: string
  placement: AdPlacement
  active: boolean
  starts_at: string | null
  ends_at: string | null
  priority: number
  impressions: number
  clicks: number
  created_at: string
  updated_at: string
}

export const RG_SAVED_KEY = 'pawfect_saved_rg'
export const RG_SEEN_KEY  = 'pawfect_seen_rg'
// Quiz answers from /onboarding for users with no profile row yet —
// applied (and cleared) by the profile-setup save
export const PENDING_PREFS_KEY = 'pawfect_pending_prefs'
// Set when the user opts out of the it's-a-match popup on every like
export const HIDE_MATCH_POPUP_KEY = 'pawfect_hide_match_popup'
// Guest-set filters (size/energy/breeds/etc. + search radius) from the
// browse page's Filters panel — logged-in users get the same fields saved
// to their profile instead via updateProfile.
export const GUEST_PREFS_KEY  = 'pawfect_guest_prefs'
export const GUEST_RADIUS_KEY = 'pawfect_guest_radius'

// ── API helpers ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
