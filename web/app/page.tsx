'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bookmark, User, X, RotateCcw, Heart,
  MapPin, SlidersHorizontal,
  ChevronDown, Globe, ChevronLeft, ChevronRight, Pencil, Search,
} from 'lucide-react'
import { usePets, useSavedPets } from '@/hooks/usePets'
import { useProfile } from '@/hooks/useProfile'
import BottomNav from '@/components/ui/BottomNav'
import AnimalDetailSheet, {
  SPECIES_BG, SPECIES_EMOJI, TAG_COLORS, shortBreed, formatAge,
} from '@/components/AnimalDetailSheet'
import FiltersSheet from '@/components/ui/FiltersSheet'
import CityAutocomplete from '@/components/ui/CityAutocomplete'
import type { PetSpecies, PetPreferences, SavedRGAnimal, UnifiedPet } from '@/types'
import { RG_SAVED_KEY, RG_SEEN_KEY, HIDE_MATCH_POPUP_KEY, GUEST_PREFS_KEY, GUEST_RADIUS_KEY } from '@/types'
import { haversineMiles, applyPreferences, localPetToUnified } from '@/lib/matching'


// Haptic feedback — silently ignored on unsupported browsers / iOS
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* noop */ }
}


// Map RG species tab → local DB species values for filtering
const RG_TO_LOCAL: Record<string, PetSpecies[]> = {
  'Dog':           ['dog'],
  'Cat':           ['cat'],
  'Rabbit':        ['rabbit'],
  'Bird':          ['bird'],
  'Small & Furry': ['small_animal'],
}

const SPECIES_TABS = [
  { label: 'All',    value: '',       icon: '🐾' },
  { label: 'Dogs',   value: 'Dog',    icon: '🐕' },
  { label: 'Cats',   value: 'Cat',    icon: '🐱' },
  { label: 'Rabbits',value: 'Rabbit', icon: '🐰' },
  { label: 'Birds',  value: 'Bird',   icon: '🦜' },
]




// ── Main page ─────────────────────────────────────────────────────────
export default function BrowsePage() {
  const [speciesFilter,    setSpeciesFilter]    = useState('')
  // Preferences filtering is always applied when the user has set any —
  // no on/off toggle. The header button opens /onboarding to edit them.
  const [animals,          setAnimals]          = useState<UnifiedPet[]>([])
  const [rgLoading,        setRgLoading]        = useState(false)
  const [rgFailed,         setRgFailed]         = useState(false)
  const [retryTick,        setRetryTick]        = useState(0)
  const [idx,              setIdx]              = useState(0)
  const [selected,         setSelected]         = useState<UnifiedPet | null>(null)
  const [matchedPet,       setMatchedPet]       = useState<UnifiedPet | null>(null)
  // Opt-out for the it's-a-match popup — liked pets still go to Saved
  const [hideMatchPopup,   setHideMatchPopup]   = useState(false)
  const toggleHideMatchPopup = (hide: boolean) => {
    setHideMatchPopup(hide)
    try {
      if (hide) localStorage.setItem(HIDE_MATCH_POPUP_KEY, '1')
      else localStorage.removeItem(HIDE_MATCH_POPUP_KEY)
    } catch { /* noop */ }
  }
  // Expand-radius state — when user exhausts all visible pets, offer to widen search
  const [hasExpanded,      setHasExpanded]      = useState(false)
  const [expandLoading,    setExpandLoading]    = useState(false)
  const [expandedToRadius, setExpandedToRadius] = useState<number | null>(null)

  // Card photo cycling — fetches all photos per animal and lets the user tap to cycle
  const [cardPhotoIdx,      setCardPhotoIdx]      = useState(0)
  const [cardPhotosCache,   setCardPhotosCache]   = useState<Record<string, string[]>>({})
  const [cardPhotosLoading, setCardPhotosLoading] = useState<Set<string>>(new Set())
  const touchMovedRef = useRef(false)

  // Persistent set of seen (liked + passed) animal IDs — prevents repeats across sessions
  const seenIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RG_SEEN_KEY)
      if (stored) seenIdsRef.current = new Set(JSON.parse(stored) as string[])
      // Fold liked RG pets into the seen set too — likes made before seen
      // tracking existed (or on other pages) must not reappear in the feed
      const savedRG = JSON.parse(localStorage.getItem(RG_SAVED_KEY) ?? '[]') as SavedRGAnimal[]
      savedRG.forEach(a => seenIdsRef.current.add(String(a.id)))
    } catch { /* noop */ }
  }, [])
  const persistSeen = () => {
    try {
      const arr = Array.from(seenIdsRef.current).slice(-5000)
      localStorage.setItem(RG_SEEN_KEY, JSON.stringify(arr))
    } catch { /* noop */ }
  }
  const markSeen = (id: string) => {
    seenIdsRef.current.add(id)
    persistSeen()
  }
  // Undo brings a card back — it shouldn't stay filtered out on reload
  const unmarkSeen = (id: string) => {
    seenIdsRef.current.delete(id)
    persistSeen()
  }

  // Location state — persisted in localStorage for guests
  const [guestCity,    setGuestCity]    = useState<string>('')
  const [showLocInput, setShowLocInput] = useState(false)
  const [locInputVal,  setLocInputVal]  = useState('')
  // Local draft so the slider tracks the finger/cursor instantly; the
  // actual commit (which triggers a refetch) is debounced so dragging
  // doesn't fire a request per pixel — that stutter was the "glitch."
  const [radiusDraft, setRadiusDraft] = useState(100)
  const radiusCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (radiusCommitTimer.current) clearTimeout(radiusCommitTimer.current) }, [])

  // Filters — logged-in users' choices live on their profile (prefs/radius
  // below); guests get the same fields persisted here instead, mirroring
  // how guestCity works, so filtering doesn't require an account.
  const [showFilters, setShowFilters] = useState(false)
  const [guestPrefs, setGuestPrefs] = useState<PetPreferences | null>(null)
  const [guestRadiusOverride, setGuestRadiusOverride] = useState<number | null>(null)

  // First-visit swipe hint (dismissed after any interaction)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const dismissHint = () => {
    if (!showSwipeHint) return
    setShowSwipeHint(false)
    try { localStorage.setItem('pawfect_interacted', '1') } catch { /* noop */ }
  }

  // All of the above default to their SSR-safe "no browser data yet" value
  // and get their real value here instead of in a useState initializer —
  // reading localStorage synchronously during the initial render mismatches
  // the server-rendered HTML (which never has access to it) and triggers a
  // hydration error, which forces React to throw away and re-render the
  // affected subtree. That's visibly disruptive on a page shaped like this
  // one (fixed-height app shell) and is a likely cause of "the layout looks
  // wrong after navigating" reports — the old `typeof window` guard did
  // nothing (`window` exists on the client during hydration too).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHideMatchPopup(!!localStorage.getItem(HIDE_MATCH_POPUP_KEY))
      setShowSwipeHint(!localStorage.getItem('pawfect_interacted'))
      setGuestCity(localStorage.getItem('pawfect_city') ?? '')
      setGuestPrefs(JSON.parse(localStorage.getItem(GUEST_PREFS_KEY) ?? 'null'))
      const savedRadius = localStorage.getItem(GUEST_RADIUS_KEY)
      setGuestRadiusOverride(savedRadius ? Number(savedRadius) : null)
    } catch { /* noop */ }
  }, [])

  // Card photo shimmer + error state
  const [imgLoaded,    setImgLoaded]    = useState(false)
  const [cardImgError, setCardImgError] = useState(false)
  const cardImgRef = useRef<HTMLImageElement>(null)

  // Like-celebration floating hearts
  const [likeHearts, setLikeHearts] = useState<{ id: number; x: number }[]>([])
  const heartIdRef = useRef(0)
  const spawnHearts = () => {
    const hearts = Array.from({ length: 5 }, () => ({
      id: ++heartIdRef.current,
      x: 20 + Math.random() * 60,
    }))
    setLikeHearts(h => [...h, ...hearts])
    setTimeout(() => setLikeHearts(h => h.filter(x => !hearts.some(hh => hh.id === x.id))), 800)
  }

  // Swipe state — on like/pass the card flies fully off-screen and fades
  // out before the next card is swapped in
  const EXIT_DX = 560
  const EXIT_MS = 280
  const [swipeDx,  setSwipeDx]  = useState(0)
  const touchStartX = useRef(0)
  const isExiting = Math.abs(swipeDx) >= 400

  const { pets, loading: localLoading }  = usePets()
  const { savedIds, toggleSave }         = useSavedPets()
  const { profile, loading: profileLoading, updateProfile } = useProfile()

  // Ref mirror so the feed effect can exclude already-saved local pets
  // without re-running (and refetching everything) on every like
  const savedIdsRef = useRef(savedIds)
  useEffect(() => { savedIdsRef.current = savedIds }, [savedIds])

  const prefs  = profile?.preferences ?? guestPrefs
  const radius = profile?.notification_prefs?.search_radius ?? 100
  const hasActiveFilters = !!prefs && (
    prefs.size.length > 0 || prefs.energy.length > 0 || prefs.breeds.length > 0 ||
    !!prefs.housing || prefs.good_with_kids === true || prefs.good_with_dogs === true || prefs.good_with_cats === true
  )

  // Track whether the user set a manual city THIS session — only then does it
  // beat their profile city. A stale localStorage city (e.g. written weeks ago
  // or by the shop page) must never silently override a logged-in profile.
  const [sessionCityIsManual, setSessionCityIsManual] = useState(false)

  // Effective search location:
  //   Logged-in: this-session manual override > profile city > stale localStorage > fallback
  //   Guest:     manual/localStorage city > fallback
  const searchCity = profile?.city
    ? (sessionCityIsManual && guestCity ? guestCity : profile.city)
    : (guestCity || 'Wichita, KS')

  // Radius priority:
  //   1. Logged-in user → always use their profile slider (even if guestCity is set)
  //   2. Guest who set a radius via the Filters panel → that, always
  //   3. Guest with a typed city → 500 mi
  //   4. Complete guest with no city → US-wide 2000 mi
  const searchRadius = profile
    ? radius               // profile slider value is always respected for logged-in users
    : guestRadiusOverride ?? (guestCity
      ? 500                // guest manually typed a city
      : 2000)              // no location at all — show everything

  // Applies a filter change from the Filters panel — persists to the
  // profile for logged-in users, to localStorage for guests, no page
  // navigation either way.
  const applyFilters = async (newPrefs: PetPreferences, newRadius: number) => {
    if (profile) {
      await updateProfile({
        preferences: newPrefs,
        notification_prefs: { ...profile.notification_prefs, search_radius: newRadius },
      })
    } else {
      setGuestPrefs(newPrefs)
      setGuestRadiusOverride(newRadius)
      try {
        localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(newPrefs))
        localStorage.setItem(GUEST_RADIUS_KEY, String(newRadius))
      } catch { /* noop */ }
    }
    setShowFilters(false)
    setIdx(0)
  }

  // Radius-only update from the location bar's inline slider — same
  // persistence path as applyFilters, but leaves preferences untouched and
  // doesn't close anything (the slider lives inline, not in a sheet).
  const commitRadius = async (newRadius: number) => {
    if (profile) {
      await updateProfile({
        notification_prefs: { ...profile.notification_prefs, search_radius: newRadius },
      })
    } else {
      setGuestRadiusOverride(newRadius)
      try { localStorage.setItem(GUEST_RADIUS_KEY, String(newRadius)) } catch { /* noop */ }
    }
    setIdx(0)
  }

  // Commits the city and refetches — does not close the panel, so picking a
  // suggestion and then adjusting the distance slider both apply before the
  // user has to explicitly dismiss it.
  const saveGuestCity = (city: string) => {
    const trimmed = city.trim()
    setSessionCityIsManual(true)   // user explicitly set this — beats profile city
    setGuestCity(trimmed)
    setLocInputVal(trimmed)        // keep the input in sync if the panel stays open (e.g. after geolocation)
    if (typeof window !== 'undefined') {
      if (trimmed) localStorage.setItem('pawfect_city', trimmed)
      else localStorage.removeItem('pawfect_city')
    }
  }

  // ── Geolocation ───────────────────────────────────────────────────
  const requestGeolocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
          { headers: { 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app)' } }
        )
        const d = await r.json()
        const city  = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.county
        const state = d.address?.state_code ?? d.address?.state
        if (city) saveGuestCity(state ? `${city}, ${state}` : city)
      } catch { /* noop */ }
    }, () => { /* user denied */ })
  }

  // Auto-use geolocation silently if permission was already granted (no prompt needed)
  useEffect(() => {
    if (guestCity || profile?.city) return  // already have a location
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(p => {
      if (p.state === 'granted') requestGeolocation()
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track RG pagination so we can load more as the user swipes
  const [rgOffset,       setRgOffset]       = useState(0)
  const [rgTotal,        setRgTotal]        = useState(0)
  const [loadMoreActive, setLoadMoreActive] = useState(false)
  const loadMoreRef = useRef(false)  // guard against concurrent fetches

  // ── Expand-radius search ─────────────────────────────────────────
  const expandSearch = async () => {
    const newRadius = Math.min(searchRadius + 100, 2000)
    setExpandLoading(true)
    try {
      const p = new URLSearchParams({
        location: searchCity,
        limit:    '50',
        radius:   String(newRadius),
      })
      if (speciesFilter) p.set('type', speciesFilter)

      const res  = await fetch(`/api/rescuegroups?${p}`)
      const data = await res.json()

      if (!data.error) {
        const existingIds = new Set(animals.map(a => a.id))
        const newPets = (data.animals ?? [])
          .filter((a: UnifiedPet) => !existingIds.has(a.id))
          .map((a: UnifiedPet) => ({
            ...a,
            photos:   Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
            orgUrl:   a.orgUrl   ?? null,
            orgEmail: a.orgEmail ?? null,
            orgPhone: a.orgPhone ?? null,
            isLocal:  false,
          }))
        setAnimals(prev => [...prev, ...newPets])
        if (data.pagination) {
          setRgOffset(data.pagination.offset + (data.animals?.length ?? 0))
          setRgTotal(data.pagination.total ?? 0)
        }
      }
      setExpandedToRadius(newRadius)
      setHasExpanded(true)
    } catch {
      setHasExpanded(true)
    }
    setExpandLoading(false)
  }

  // ── Load more RG animals (same search, next page) ────────────────
  const loadMoreRG = async (currentAnimals: UnifiedPet[], offset: number) => {
    if (loadMoreRef.current) return
    loadMoreRef.current = true
    setLoadMoreActive(true)
    try {
      const p = new URLSearchParams({
        location: searchCity,
        limit:    '50',
        offset:   String(offset),
        radius:   String(searchRadius),
      })
      if (speciesFilter) p.set('type', speciesFilter)

      const res  = await fetch(`/api/rescuegroups?${p}`)
      const data = await res.json()

      if (!data.error && Array.isArray(data.animals) && data.animals.length > 0) {
        const existingIds = new Set(currentAnimals.map(a => a.id))
        const newPets = data.animals
          .filter((a: UnifiedPet) => !existingIds.has(a.id) && !seenIdsRef.current.has(String(a.id)))
          .map((a: UnifiedPet) => ({
            ...a,
            photos:   Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
            orgUrl:   a.orgUrl   ?? null,
            orgEmail: a.orgEmail ?? null,
            orgPhone: a.orgPhone ?? null,
            isLocal:  false,
          }))
        setAnimals(prev => [...prev, ...newPets])
        setRgOffset(offset + data.animals.length)
        setRgTotal(data.pagination?.total ?? rgTotal)
      }
    } catch { /* silently skip */ }
    setLoadMoreActive(false)
    loadMoreRef.current = false
  }

  // ── Build unified animal list ─────────────────────────────────────
  useEffect(() => {
    // Wait for the profile before the first fetch — otherwise we'd search the
    // fallback city and briefly show far-away animals to logged-in users
    if (profileLoading) return

    // Filter & convert local DB pets
    const localSpecies = speciesFilter ? (RG_TO_LOCAL[speciesFilter] ?? []) : []
    const baseLocal = speciesFilter
      ? pets.filter(p => localSpecies.includes(p.species))
      : pets

    const filteredLocal = prefs
      ? applyPreferences(baseLocal, prefs)
      : baseLocal

    const localUnified = filteredLocal.map(localPetToUnified)

    // Reset expand state + pagination on fresh searches. Intentional
    // synchronous reset before the AbortController-guarded fetch below —
    // restructuring this out of the effect would break search-cancellation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasExpanded(false)
    setExpandedToRadius(null)
    setRgOffset(0)
    setRgTotal(0)
    loadMoreRef.current = false

    // Fetch RescueGroups using the effective search city/radius — initial 50 animals
    setRgLoading(true)
    setRgFailed(false)
    const params = new URLSearchParams({
      location: searchCity,
      limit:    '50',
      radius:   String(searchRadius),
    })
    if (speciesFilter) params.set('type', speciesFilter)

    const ac = new AbortController()
    fetch(`/api/rescuegroups?${params}`, { signal: ac.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { animals?: UnifiedPet[]; setup?: boolean; searchCoords?: { lat: number; lon: number }; pagination?: { countReturned: number; total: number; offset: number } }) => {
        // Distance-filter local pets against the same search origin the API
        // used — a rescue in Kansas shouldn't show for a San Diego user.
        // Pets whose rescue has no coords are kept (fail open).
        // Skip local pets the user already liked (they live in Saved now)
        // or already passed on (seen set covers local + RG pets)
        const unseenLocal = localUnified.filter(p =>
          !savedIdsRef.current.has(p.id) && !seenIdsRef.current.has(p.id))
        const nearbyLocal = data.searchCoords
          ? unseenLocal.filter(p =>
              p.rescueLat == null || p.rescueLon == null ||
              haversineMiles(data.searchCoords!.lat, data.searchCoords!.lon, p.rescueLat, p.rescueLon) <= searchRadius
            )
          : unseenLocal

        if (data.setup) {
          setAnimals(nearbyLocal)
        } else {
          const rgPets = (data.animals ?? [])
            .filter((a: UnifiedPet) => !seenIdsRef.current.has(String(a.id)))
            .map((a: UnifiedPet) => ({
              ...a,
              photos:    Array.isArray(a.photos) && a.photos.length > 0 ? a.photos : (a.photo ? [a.photo] : []),
              orgUrl:    a.orgUrl    ?? null,
              orgEmail:  a.orgEmail  ?? null,
              orgPhone:  a.orgPhone  ?? null,
              isLocal:   false,
            }))
          setAnimals([...nearbyLocal, ...rgPets])
          if (data.pagination) {
            setRgOffset(data.pagination.offset + rgPets.length)
            setRgTotal(data.pagination.total)
          }
        }
        setIdx(0)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setAnimals(localUnified.filter(p =>
            !savedIdsRef.current.has(p.id) && !seenIdsRef.current.has(p.id)))
          setIdx(0)
          setRgFailed(true)
        }
      })
      .finally(() => { if (!ac.signal.aborted) setRgLoading(false) })
    return () => ac.abort()
  }, [pets, speciesFilter, prefs, searchCity, searchRadius, retryTick, profileLoading])

  // ── Auto-load more when queue is getting low (< 15 animals left) ─
  useEffect(() => {
    const remaining = animals.length - idx
    if (remaining < 15 && !loadMoreRef.current && !loadMoreActive && rgOffset > 0 && rgOffset < rgTotal) {
      loadMoreRG(animals, rgOffset)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, animals.length, rgOffset, rgTotal, loadMoreActive])

  const isLoading = localLoading || rgLoading || profileLoading
  const pet = animals[idx] ?? null

  // ── Card photo fetching ───────────────────────────────────────────
  // Whenever the active card changes, reset the photo index and pre-fetch
  // all photos for RG animals (active + next 7) so tapping cycles through them.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCardPhotoIdx(0)

    // Pre-fetch photos for the current card + next 7 cards
    const toFetch = animals.slice(idx, idx + 8).filter(a => !a.isLocal && !cardPhotosCache[a.id])
    if (toFetch.length === 0) return

    // Mark all as loading before any fetch starts
    setCardPhotosLoading(prev => {
      const s = new Set(prev)
      for (const a of toFetch) s.add(a.id)
      return s
    })

    for (const a of toFetch) {
      fetch(`/api/rescuegroups/animal/${a.id}`)
        .then(r => r.json())
        .then((data: { photos?: string[] }) => {
          if (Array.isArray(data.photos) && data.photos.length > 0) {
            setCardPhotosCache(prev => ({ ...prev, [a.id]: data.photos! }))
          }
        })
        .catch(() => {})
        .finally(() => {
          setCardPhotosLoading(prev => { const s = new Set(prev); s.delete(a.id); return s })
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet?.id])

  // Photos available on the current card (fetched set, or existing single thumbnail)
  const cardPhotos: string[] = pet
    ? pet.isLocal
      ? (pet.photos.length > 0 ? pet.photos : (pet.photo ? [pet.photo] : []))
      : (cardPhotosCache[pet.id] ?? (pet.photos.length > 0 ? pet.photos : (pet.photo ? [pet.photo] : [])))
    : []
  const safeCardIdx      = Math.min(cardPhotoIdx, Math.max(0, cardPhotos.length - 1))
  const currentCardPhoto = cardPhotos[safeCardIdx] ?? null

  // True when we have no photo yet but the individual-endpoint fetch is still in-flight.
  // Shows a shimmer instead of the fallback emoji, then reveals the photo when it lands.
  const isPhotoFetching = !!pet && !pet.isLocal
    && !currentCardPhoto && cardPhotosLoading.has(pet.id)

  // ── Actions ───────────────────────────────────────────────────────
  // doPass / doLike = pure state mutations (no animation); called after card flies out
  const doPass = () => {
    dismissHint()
    if (pet) markSeen(pet.id)
    setIdx(i => Math.min(i + 1, animals.length))
  }
  const doLike = () => {
    if (!pet) return
    dismissHint()
    markSeen(pet.id)
    spawnHearts()
    if (pet.isLocal) {
      toggleSave(pet.id)
    } else {
      try {
        const existing: SavedRGAnimal[] = JSON.parse(localStorage.getItem(RG_SAVED_KEY) ?? '[]')
        if (!existing.some(a => a.id === pet.id)) {
          const entry: SavedRGAnimal = {
            id: pet.id, name: pet.name, type: pet.type, breed: pet.breed,
            age: pet.age, gender: pet.gender,
            // Prefer the fetched gallery photo for higher quality on the Saved page
            photo: cardPhotosCache[pet.id]?.[0] ?? pet.photo,
            orgName: pet.orgName,
            orgUrl: pet.orgUrl, orgEmail: pet.orgEmail, orgPhone: pet.orgPhone,
            city: pet.city, savedAt: new Date().toISOString(),
          }
          localStorage.setItem(RG_SAVED_KEY, JSON.stringify([entry, ...existing]))
        }
      } catch { /* localStorage unavailable */ }
    }
    if (!hideMatchPopup) setMatchedPet(pet)
    setIdx(i => Math.min(i + 1, animals.length))
  }

  // handlePass / handleLike = animated versions used by buttons and keyboard
  const handlePass = () => {
    if (!pet) return
    vibrate([5, 5])
    setSwipeDx(-EXIT_DX)
    setTimeout(() => { doPass(); setSwipeDx(0) }, EXIT_MS)
  }
  const handleLike = () => {
    if (!pet) return
    vibrate(20)
    setSwipeDx(EXIT_DX)
    setTimeout(() => { doLike(); setSwipeDx(0) }, EXIT_MS)
  }
  const handleUndo = () => {
    const prev = animals[idx - 1]
    if (prev) unmarkSeen(prev.id)
    setIdx(i => Math.max(i - 1, 0))
  }

  // ── Swipe ─────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 80
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchMovedRef.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    setSwipeDx(dx)
    if (Math.abs(dx) > 10) touchMovedRef.current = true  // mark as swipe, not tap
  }
  const handleTouchEnd = () => {
    if (swipeDx > SWIPE_THRESHOLD) {
      vibrate(20)
      setSwipeDx(EXIT_DX)
      setTimeout(() => { doLike(); setSwipeDx(0) }, EXIT_MS)
    } else if (swipeDx < -SWIPE_THRESHOLD) {
      vibrate([5, 5])
      setSwipeDx(-EXIT_DX)
      setTimeout(() => { doPass(); setSwipeDx(0) }, EXIT_MS)
    } else {
      setSwipeDx(0)
    }
  }

  // Reset shimmer/error state when active photo changes.
  // For cached images onLoad never fires — check complete on next tick after DOM updates.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgLoaded(false)
    setCardImgError(false)
    const id = setTimeout(() => {
      if (!cardImgRef.current) return
      if (cardImgRef.current.complete && (cardImgRef.current.naturalWidth ?? 0) > 0) {
        setImgLoaded(true)  // cached and loaded
      } else if (cardImgRef.current.complete && (cardImgRef.current.naturalWidth ?? 0) === 0) {
        setImgLoaded(true); setCardImgError(true)  // failed before React mounted
      }
    }, 0)
    return () => clearTimeout(id)
  }, [currentCardPhoto])

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected || matchedPet) return
      if (!pet) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') handlePass()
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleLike()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, matchedPet, pet])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-shell-height flex items-start justify-center px-3 py-2 overflow-hidden">
        <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🐾</span>
              <span className="text-xl font-bold">
                <span style={{ color: '#e05a4e' }}>Pawfect</span>
                <span className="text-gray-900"> Match</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(true)}
                title="Filters"
                className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                style={{ color: '#e05a4e' }}
              >
                <SlidersHorizontal size={16} />
                {hasActiveFilters && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#e05a4e' }} />
                )}
              </button>
              <a href="/saved" className="text-gray-400 hover:text-gray-600">
                <Bookmark size={20} />
              </a>
              <a href="/profile" className="text-gray-400 hover:text-gray-600">
                <User size={20} />
              </a>
            </div>
          </header>

          {/* Onboarding nudge */}
          {profile && !prefs && (
            <a
              href="/onboarding"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-2 text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#e05a4e,#c44b40)' }}
            >
              <SlidersHorizontal size={15} />
              <span>Customize your feed — set pet preferences</span>
              <span className="ml-auto text-white/70">→</span>
            </a>
          )}

          {/* Location bar — always visible, editable */}
          <div className="px-1 mb-2">
            {showLocInput ? (
              <div className="bg-white rounded-xl shadow-md px-3 py-2.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <CityAutocomplete
                      value={locInputVal}
                      onChange={setLocInputVal}
                      onSelect={saveGuestCity}
                      onEnter={saveGuestCity}
                      placeholder="City, State or zip — e.g. Austin, TX or 92101"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => requestGeolocation()}
                    title="Use my location"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    📍
                  </button>
                  <button
                    onClick={() => saveGuestCity(locInputVal)}
                    title="Search this location"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    <Search size={13} />
                  </button>
                  <button
                    onClick={() => {
                      // Flush rather than drop a still-pending debounced radius change
                      if (radiusCommitTimer.current) {
                        clearTimeout(radiusCommitTimer.current)
                        if (radiusDraft !== searchRadius) commitRadius(radiusDraft)
                      }
                      setShowLocInput(false)
                    }}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Distance — adjusts live, no separate save step */}
                <div className="px-0.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-xs font-medium text-gray-500">Distance</label>
                    <span className="text-xs font-semibold" style={{ color: '#e05a4e' }}>{radiusDraft} mi</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={radiusDraft}
                    onChange={e => {
                      const next = Number(e.target.value)
                      setRadiusDraft(next)
                      if (radiusCommitTimer.current) clearTimeout(radiusCommitTimer.current)
                      radiusCommitTimer.current = setTimeout(() => commitRadius(next), 400)
                    }}
                    className="w-full accent-[#e05a4e]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setLocInputVal(guestCity || profile?.city || '')
                    // 2000mi is the "no preference set" nationwide default for
                    // guests with no city — the slider itself tops out at
                    // 500mi (matching the Filters panel), so clamp the seed
                    // to keep the displayed number and thumb position in sync.
                    setRadiusDraft(Math.min(searchRadius, 500))
                    setShowLocInput(true)
                  }}
                  className="flex items-center gap-1.5 text-white/70 text-xs hover:text-white/90 transition-colors group"
                >
                  <MapPin size={11} />
                  <span>
                    {searchCity === 'Wichita, KS' && !guestCity && !profile?.city
                      ? 'All locations'
                      : searchCity}
                  </span>
                  {(profile?.city || guestCity) && (
                    <span className="text-white/40">· within {searchRadius} mi</span>
                  )}
                  <Pencil size={10} className="ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
                {!isLoading && rgTotal > 0 && (
                  <span className="ml-2 text-white/40 text-[10px]">
                    {rgTotal.toLocaleString()} pets
                  </span>
                )}
                {!guestCity && !profile?.city && (
                  <button
                    onClick={requestGeolocation}
                    className="ml-2 flex items-center gap-1 text-white/70 text-[10px] hover:text-white/90 transition-colors animate-soft-pulse"
                  >
                    📍 Use my location
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Species filter tabs — right-edge fade hints there are more tabs to scroll */}
          <div className="relative mb-3">
            <div className="flex gap-2 px-1 overflow-x-auto scrollbar-none">
            {SPECIES_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setSpeciesFilter(tab.value); setIdx(0) }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  speciesFilter === tab.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={speciesFilter === tab.value
                  ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' }
                  : {}}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            </div>
            {/* Fade to hint scrollability */}
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, var(--bg, #c4b5a2))' }} />
          </div>

          {/* Card area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Rescue-network error banner — non-blocking, retryable */}
            {rgFailed && !isLoading && (
              <button
                onClick={() => setRetryTick(t => t + 1)}
                className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 text-left"
              >
                <span className="text-base">📡</span>
                <span className="flex-1 text-xs text-amber-800 leading-snug">
                  Couldn&apos;t reach the rescue network — showing local pets only.
                </span>
                <span className="text-xs font-bold text-amber-700 flex-shrink-0">Retry ↻</span>
              </button>
            )}
            {isLoading ? (
              /* Loading skeleton */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col animate-pulse">
                <div className="flex-1 min-h-[160px] bg-gray-100" />
                <div className="px-4 pt-3 pb-4 space-y-2">
                  <div className="h-6 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="flex gap-1.5">
                    <div className="h-6 bg-gray-100 rounded-full w-16" />
                    <div className="h-6 bg-gray-100 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ) : pet ? (
              /* Pet card */
              <div className="flex-1 min-h-0 relative">
              <div
                key={pet.id}
                className="absolute inset-0 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col select-none animate-card-in"
                style={{
                  zIndex: 3,
                  transform:  `translateX(${swipeDx}px) rotate(${swipeDx * 0.04}deg)`,
                  opacity:    isExiting ? 0 : 1,
                  transition: isExiting
                    ? `transform ${EXIT_MS / 1000}s ease-out, opacity ${EXIT_MS / 1000}s ease-in`
                    : swipeDx === 0
                    ? 'transform 0.25s ease'
                    : 'none',
                  willChange:  'transform, opacity',
                  touchAction: 'pan-y',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* LIKE overlay */}
                {swipeDx > 10 && (
                  <div className="absolute inset-0 z-20 flex items-start justify-start p-6 pointer-events-none rounded-2xl"
                    style={{ opacity: Math.min(swipeDx / 100, 1), background: 'rgba(34,197,94,0.15)' }}>
                    <div className="border-4 border-green-500 rounded-lg px-3 py-1 rotate-[-15deg]">
                      <span className="text-green-500 text-2xl font-black tracking-wide">LIKE</span>
                    </div>
                  </div>
                )}
                {/* NOPE overlay */}
                {swipeDx < -10 && (
                  <div className="absolute inset-0 z-20 flex items-start justify-end p-6 pointer-events-none rounded-2xl"
                    style={{ opacity: Math.min(-swipeDx / 100, 1), background: 'rgba(239,68,68,0.15)' }}>
                    <div className="border-4 border-red-500 rounded-lg px-3 py-1 rotate-[15deg]">
                      <span className="text-red-500 text-2xl font-black tracking-wide">NOPE</span>
                    </div>
                  </div>
                )}

                {/* Photo — tap to cycle through all photos */}
                <div
                  className="relative flex items-center justify-center overflow-hidden flex-1 min-h-0"
                  style={{ minHeight: 160, background: SPECIES_BG[pet.type] ?? SPECIES_BG.other, cursor: cardPhotos.length > 1 ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Only cycle on a tap (not after a swipe gesture)
                    if (!touchMovedRef.current && cardPhotos.length > 1) {
                      setCardPhotoIdx(i => (i + 1) % cardPhotos.length)
                    }
                  }}
                >
                  {/* Org badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      {pet.isLocal ? '🏠' : <Globe size={10} />}
                      {pet.orgName}
                    </span>
                  </div>

                  {isPhotoFetching ? (
                    /* Shimmer while individual-endpoint fetch is in-flight */
                    <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  ) : currentCardPhoto && !cardImgError ? (
                    <>
                      {!imgLoaded && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                      )}
                      <img
                        ref={cardImgRef}
                        src={currentCardPhoto}
                        alt={pet.name}
                        className="w-full h-full object-cover object-top"
                        style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
                        onLoad={() => setImgLoaded(true)}
                        onError={() => { setImgLoaded(true); setCardImgError(true) }}
                      />
                    </>
                  ) : (
                    <span className="text-[100px] select-none drop-shadow-sm">
                      {SPECIES_EMOJI[pet.type] ?? '🐾'}
                    </span>
                  )}

                  {/* Photo count badge */}
                  {cardPhotos.length > 1 && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-black/40 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        📷 {cardPhotos.length}
                      </span>
                    </div>
                  )}

                  {/* Photo dots — tap to advance */}
                  {cardPhotos.length > 1 && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {cardPhotos.slice(0, 8).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all"
                          style={{
                            width: i === safeCardIdx ? 14 : 6,
                            height: 6,
                            backgroundColor: i === safeCardIdx ? 'white' : 'rgba(255,255,255,0.45)',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Location + distance */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-2 py-1 rounded-full">
                      <MapPin size={10} />{pet.city}
                      {typeof pet.distance === 'number' && (
                        <span className="text-gray-400">· {pet.distance < 1 ? '<1' : pet.distance} mi</span>
                      )}
                    </span>
                  </div>

                  {/* First-visit swipe hint — shown once until user interacts */}
                  {showSwipeHint && idx === 0 && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                      <div className="animate-bounce-left flex items-center gap-1.5 bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        <ChevronLeft size={12} /> Pass
                      </div>
                      <div className="animate-bounce-right flex items-center gap-1.5 bg-green-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        Like <ChevronRight size={12} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info — tags/description hide on short viewports (see globals.css
                    @media max-height) so the action buttons below are never
                    squeezed past the bottom nav on small-height phones */}
                <div className="px-4 pt-3 pb-2 short-viewport-compact">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>
                    {pet.age && <span className="text-gray-400 text-sm">{formatAge(pet.age)}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {[shortBreed(pet.breed), pet.gender, pet.size].filter(Boolean).join(' · ')}
                  </p>
                  {pet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 hide-on-short-viewport">
                      {/* Skip Male/Female — already shown in the subtitle breed line */}
                      {pet.tags.filter(t => t !== 'Male' && t !== 'Female').slice(0, 5).map(t => (
                        <span key={t} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  {pet.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 hide-on-short-viewport">{pet.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-2 relative">
                  {/* Floating like hearts */}
                  {likeHearts.map(h => (
                    <div key={h.id} className="absolute bottom-10 animate-float-up pointer-events-none text-lg"
                      style={{ left: `${h.x}%`, zIndex: 20 }}>
                      ❤️
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <button onClick={handlePass} aria-label="Pass on this pet"
                      className="w-12 h-12 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm hover:shadow">
                      <X size={20} />
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={idx === 0}
                      aria-label="Undo last swipe"
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-50 disabled:hover:bg-white"
                    >
                      <RotateCcw size={16} />
                    </button>
                    {/* Info → open detail modal */}
                    <button
                      onClick={() => setSelected(pet)}
                      aria-label="View pet details"
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={handleLike} aria-label="Like this pet"
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm hover:shadow"
                      style={{
                        borderColor: '#e05a4e',
                        color: '#e05a4e',
                        backgroundColor: (pet.isLocal && savedIds.has(pet.id)) ? '#fef2f2' : 'white',
                      }}>
                      <Heart size={20} fill={(pet.isLocal && savedIds.has(pet.id)) ? '#e05a4e' : 'none'} />
                    </button>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 px-2 pb-1">
                    <span>← pass</span>
                    <span>tap ↓ for details</span>
                    <span>like →</span>
                  </div>
                </div>
              </div>
              </div>
            ) : loadMoreActive ? (
              /* Loading more animals — shown while auto-fetching the next page */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
                <div className="relative mb-4">
                  <span className="text-5xl">🐾</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center" style={{ backgroundColor: '#e05a4e' }}>
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <p className="text-base font-semibold text-gray-700 mb-1">Finding more pets…</p>
                <p className="text-sm text-gray-400">Searching rescue networks near you</p>
              </div>
            ) : (
              /* Empty state */
              <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center py-8 px-8 text-center">
                <span className="text-6xl mb-4">🐾</span>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {animals.length === 0 && prefs
                    ? 'No matches for your preferences'
                    : hasExpanded
                    ? `You've seen all pets within ${expandedToRadius ?? searchRadius} miles!`
                    : "You've seen all the pets near you!"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {!hasExpanded && searchRadius + 100 <= 2000
                    ? `Want to see more? We can search a wider area.`
                    : 'Check back soon — new animals are added daily.'}
                </p>

                <div className="flex flex-col gap-2 w-full">
                  {/* Expand radius — show when not yet expanded and there's room */}
                  {!hasExpanded && searchRadius + 100 <= 2000 && (
                    <button
                      onClick={expandSearch}
                      disabled={expandLoading}
                      className="px-5 py-3 rounded-full text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ backgroundColor: '#e05a4e' }}
                    >
                      {expandLoading
                        ? <><span className="animate-spin">⏳</span> Searching further…</>
                        : `Search within ${Math.min(searchRadius + 100, 2000)} miles →`}
                    </button>
                  )}

                  <button
                    onClick={() => setIdx(0)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold ${!hasExpanded && searchRadius + 100 <= 2000 ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'text-white'}`}
                    style={!hasExpanded && searchRadius + 100 <= 2000 ? {} : { backgroundColor: '#e05a4e' }}
                  >
                    Start over
                  </button>

                  {hasActiveFilters && (
                    <button
                      onClick={() => setShowFilters(true)}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 text-center">
                      Adjust your filters
                    </button>
                  )}
                  {!profile && (
                    <a href="/login"
                      className="px-5 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 text-center">
                      Sign in to save your location &amp; preferences
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>

      {/* Detail sheet */}
      {selected && (
        <AnimalDetailSheet
          animal={selected}
          onClose={() => setSelected(null)}
          initialPhotos={cardPhotosCache[selected.id]}
          prefs={prefs}
        />
      )}

      {/* Filters panel — everything editable in one place, no page navigation */}
      {showFilters && (
        <FiltersSheet
          initialPrefs={prefs}
          initialRadius={searchRadius}
          onApply={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* ── Match celebration overlay ── */}
      {matchedPet && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
          onClick={() => setMatchedPet(null)}
        >
          <div className="min-h-full flex items-center justify-center px-6 py-6">
          <div
            className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[340px]"
            onClick={e => e.stopPropagation()}
          >
            {/* Pet photo strip — prefer gallery photo if cached, fall back to thumbnail */}
            {(() => {
              const matchPhoto = cardPhotosCache[matchedPet.id]?.[0] ?? matchedPet.photos?.[0] ?? matchedPet.photo
              return matchPhoto ? (
                <div
                  className="h-44 overflow-hidden"
                  style={{ background: SPECIES_BG[matchedPet.type] ?? SPECIES_BG.other }}
                >
                  <img src={matchPhoto} alt={matchedPet.name} className="w-full h-full object-cover" />
                </div>
              ) : null
            })()}

            <div className="px-6 pt-5 pb-6 text-center">
              <div className="flex justify-center items-end gap-1.5 mb-3">
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>❤️</span>
                <span className="text-4xl animate-bounce">🐾</span>
                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>❤️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                It&apos;s a match! 🎉
              </h2>
              <p className="text-sm font-medium mb-0.5" style={{ color: '#e05a4e' }}>{matchedPet.name} wants to meet you!</p>
              <p className="text-sm text-gray-400 mb-5">Here&apos;s how to make it official:</p>

              <ol className="text-sm text-gray-600 text-left space-y-3 mb-6">
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >1</span>
                  <span>Check out {matchedPet.name}&apos;s full profile and adoption details</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >2</span>
                  <span>Fill out an adoption application with {matchedPet.orgName}</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >3</span>
                  <span>The rescue reviews your app and reaches out to schedule a meet!</span>
                </li>
              </ol>

              <div className="flex flex-col gap-2">
                {/* Primary CTA */}
                {matchedPet.isLocal ? (
                  <a
                    href={matchedPet.url}
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    View {matchedPet.name}&apos;s profile &amp; apply →
                  </a>
                ) : matchedPet.orgUrl ? (
                  <a
                    href={matchedPet.orgUrl.startsWith('http') ? matchedPet.orgUrl : `https://${matchedPet.orgUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-3 rounded-xl text-white font-semibold text-sm text-center"
                    style={{ backgroundColor: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    Visit {matchedPet.orgName}&apos;s website →
                  </a>
                ) : (
                  <div className="py-3 px-4 rounded-xl text-center bg-gray-50 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">{matchedPet.orgName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Contact them to start {matchedPet.name}&apos;s adoption</p>
                  </div>
                )}
                {!matchedPet.isLocal && matchedPet.orgEmail && (
                  <a
                    href={`mailto:${matchedPet.orgEmail}?subject=Adoption inquiry: ${encodeURIComponent(matchedPet.name)}&body=Hi! I found ${encodeURIComponent(matchedPet.name)} on Pawfect Match and would love to adopt them. Could you share more details and send me an application?`}
                    className="block py-3 rounded-xl font-semibold text-sm text-center border-2"
                    style={{ borderColor: '#e05a4e', color: '#e05a4e' }}
                    onClick={() => setMatchedPet(null)}
                  >
                    ✉️ Email {matchedPet.orgName}
                  </a>
                )}
                {!matchedPet.isLocal && matchedPet.orgPhone && (
                  <a
                    href={`tel:${matchedPet.orgPhone}`}
                    className="block py-3 rounded-xl font-semibold text-sm text-center border border-gray-200 text-gray-600"
                    onClick={() => setMatchedPet(null)}
                  >
                    📞 {matchedPet.orgPhone}
                  </a>
                )}
                <button
                  onClick={() => setMatchedPet(null)}
                  className="py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Keep browsing
                </button>

                <label className="flex items-start gap-2 pt-1 cursor-pointer select-none text-left">
                  <input
                    type="checkbox"
                    checked={hideMatchPopup}
                    onChange={e => toggleHideMatchPopup(e.target.checked)}
                    className="mt-0.5 accent-[#e05a4e]"
                  />
                  <span className="text-xs text-gray-400 leading-snug">
                    Hide this popup for now — pets you like are still kept in your{' '}
                    <a href="/saved" className="underline" onClick={() => setMatchedPet(null)}>Saved</a> list
                  </span>
                </label>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
