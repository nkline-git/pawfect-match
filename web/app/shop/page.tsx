'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, MapPin, Loader2, Phone, Globe, ChevronDown, ChevronUp, Navigation } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import SponsoredBanner from '@/components/ui/SponsoredBanner'
import CityStateSearch from '@/components/ui/CityStateSearch'
import { parseStateFromCity, stripStateFromCity } from '@/lib/usStates'
import { createClient } from '@/lib/supabase/client'
import { geocodeCity } from '@/lib/geocode'

// Big-box chain classification now happens server-side (app/api/nearby-stores)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtMiles(mi: number) {
  return mi < 0.1 ? '< 0.1 mi' : `${mi.toFixed(1)} mi`
}

type Store = {
  id: number
  name: string
  lat: number
  lon: number
  distance: number
  phone?: string
  website?: string
  address?: string
  chain: boolean
}

// ── Product catalogue ──────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All',      value: 'all',      icon: '🛍️' },
  { label: 'Food',     value: 'food',     icon: '🥩' },
  { label: 'Toys',     value: 'toys',     icon: '🎾' },
  { label: 'Beds',     value: 'beds',     icon: '🛏️' },
  { label: 'Grooming', value: 'grooming', icon: '✂️' },
  { label: 'Health',   value: 'health',   icon: '💊' },
  { label: 'Travel',   value: 'travel',   icon: '🚗' },
]

// Curated list of real, widely-sold products. Each links to a Chewy.com
// search for that product, where the actual price, stock, and reviews are
// shown. No prices, ratings, review counts, or deal badges are stored here:
// they change constantly and can't be kept accurate from a static list.
type Product = {
  id: string; category: string; name: string; sub: string
  emoji: string; brand: string; url: string
}

const PRODUCTS: Product[] = [
  { id:'1',  category:'food',     name:"Hill's Science Diet",          sub:'Adult Chicken & Barley',      emoji:'🥩', brand:"Hill's",        url:'https://www.chewy.com/s?query=hills+science+diet' },
  { id:'2',  category:'food',     name:'Blue Buffalo Life Protection', sub:'Adult Chicken & Brown Rice',  emoji:'🐟', brand:'Blue Buffalo',  url:'https://www.chewy.com/s?query=blue+buffalo+life+protection' },
  { id:'3',  category:'food',     name:'Purina Pro Plan',              sub:'High Protein Salmon & Rice',  emoji:'🥣', brand:'Purina',        url:'https://www.chewy.com/s?query=purina+pro+plan+salmon' },
  { id:'4',  category:'food',     name:'Royal Canin Indoor',           sub:'Adult Dry Cat Food',          emoji:'🐱', brand:'Royal Canin',   url:'https://www.chewy.com/s?query=royal+canin+indoor+adult' },
  { id:'5',  category:'toys',     name:'KONG Classic',                 sub:'Durable Rubber Chew Toy',     emoji:'🎾', brand:'KONG',          url:'https://www.chewy.com/s?query=kong+classic' },
  { id:'6',  category:'toys',     name:'Chuckit! Ultra Ball',          sub:'High Bounce Fetch Ball',      emoji:'⚽', brand:'Chuckit!',      url:'https://www.chewy.com/s?query=chuckit+ultra+ball' },
  { id:'7',  category:'toys',     name:'Nina Ottosson Dog Puzzle',     sub:'Interactive Puzzle Toy',      emoji:'🧩', brand:'Outward Hound', url:'https://www.chewy.com/s?query=nina+ottosson+dog+puzzle' },
  { id:'8',  category:'toys',     name:'Yeowww! Catnip Banana',        sub:'Organic Catnip Toy',          emoji:'🍌', brand:'Yeowww!',       url:'https://www.chewy.com/s?query=yeowww+catnip+banana' },
  { id:'9',  category:'beds',     name:'PetFusion Ultimate Lounge',    sub:'Memory Foam Dog Bed',         emoji:'🛏️', brand:'PetFusion',     url:'https://www.chewy.com/s?query=petfusion+ultimate+lounge' },
  { id:'10', category:'beds',     name:'K&H Thermo-Kitty',             sub:'Self-Warming Cat Bed',        emoji:'🌡️', brand:'K&H',           url:'https://www.chewy.com/s?query=kh+thermo+kitty' },
  { id:'11', category:'grooming', name:'FURminator Deshedding Tool',   sub:'For Long-Hair Dogs',          emoji:'✂️', brand:'FURminator',    url:'https://www.chewy.com/s?query=furminator+deshedding' },
  { id:'12', category:'grooming', name:"Burt's Bees Dog Shampoo",      sub:'Hypoallergenic, Tearless',    emoji:'🛁', brand:"Burt's Bees",   url:'https://www.chewy.com/s?query=burts+bees+dog+shampoo' },
  { id:'13', category:'health',   name:'Zesty Paws Multivitamin',      sub:'Chewable Bites for Dogs',     emoji:'💊', brand:'Zesty Paws',    url:'https://www.chewy.com/s?query=zesty+paws+multivitamin' },
  { id:'14', category:'health',   name:'Vetri-Science Composure',      sub:'Calming Supplement for Dogs', emoji:'🌿', brand:'Vetri-Science', url:'https://www.chewy.com/s?query=vetri+science+composure' },
  { id:'15', category:'travel',   name:'Kurgo Tru-Fit Harness',        sub:'Car Safety Harness',          emoji:'🚗', brand:'Kurgo',         url:'https://www.chewy.com/s?query=kurgo+tru-fit+harness' },
  { id:'16', category:'travel',   name:'Ruffwear Front Range Pack',    sub:'Dog Hiking Backpack',         emoji:'🎒', brand:'Ruffwear',      url:'https://www.chewy.com/s?query=ruffwear+front+range+pack' },
]

// ── Product card ───────────────────────────────────────────────────
function ProductCard({ p }: { p: Product }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e05a4e]"
    >
      <div className="h-24 bg-gray-50 flex items-center justify-center" aria-hidden="true">
        <span className="text-5xl">{p.emoji}</span>
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-[10px] text-gray-400 mb-0.5">{p.brand}</p>
        <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
        <p className="text-[10px] text-gray-400 line-clamp-1 mb-2">{p.sub}</p>
        <div
          className="mt-auto w-full py-1.5 rounded-xl text-white text-[11px] font-semibold text-center flex items-center justify-center gap-1"
          style={{ backgroundColor: '#e05a4e' }}
        >
          See price on Chewy <ExternalLink size={9} />
        </div>
      </div>
    </a>
  )
}

// ── Store card ─────────────────────────────────────────────────────
function StoreCard({ store }: { store: Store }) {
  const [mapOk, setMapOk] = useState(true)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`
  const mapUrl  = `https://staticmap.openstreetmap.de/staticmap.php?center=${store.lat},${store.lon}&zoom=15&size=390x120&markers=${store.lat},${store.lon},red-pushpin`
  const hue     = store.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const initial = store.name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Map thumbnail */}
      <div className="relative overflow-hidden" style={{ height: 100 }}>
        {mapOk ? (
          <Image
            src={mapUrl}
            alt=""
            fill
            sizes="390px"
            className="object-cover"
            onError={() => setMapOk(false)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${hue},35%,88%), hsl(${(hue+40)%360},35%,82%))` }}
          >
            <MapPin size={36} style={{ color: `hsl(${hue},45%,50%)`, opacity: 0.35 }} />
          </div>
        )}
        {/* Bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        {/* Badges */}
        {!store.chain && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
            Local
          </span>
        )}
        <span className="absolute top-2 right-2 text-xs font-bold bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-0.5 rounded-full shadow-sm">
          {fmtMiles(store.distance)}
        </span>
      </div>

      {/* Store info */}
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: `hsl(${hue},50%,45%)` }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{store.name}</p>
            {store.address && <p className="text-xs text-gray-400 truncate">{store.address}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold text-center flex items-center justify-center gap-1"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Navigation size={11} /> Directions
          </a>
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 text-center flex items-center justify-center gap-1"
            >
              <Phone size={11} /> Call
            </a>
          )}
          {store.website && (
            <a
              href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 text-center flex items-center justify-center gap-1"
            >
              <Globe size={11} /> Website
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Partner stores (registered on Pawfect Match) ──────────────────
function PartnerStores() {
  const supabase = createClient()
  type PSStore = { id: string; name: string; city: string | null; logo: string; cover_color: string; specialties: string[]; hours: string | null; verified: boolean; featured?: boolean }
  const [stores,   setStores]   = useState<PSStore[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // featured arrives with migration 014 — fall back to the older column
    // list until it's applied
    supabase
      .from('pet_stores')
      .select('id, name, city, logo, cover_color, specialties, hours, verified, featured')
      .order('featured', { ascending: false })
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(async ({ data, error }) => {
        if (error?.code === '42703') {
          const fallback = await supabase
            .from('pet_stores')
            .select('id, name, city, logo, cover_color, specialties, hours, verified')
            .order('verified', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20)
          setStores((fallback.data ?? []) as PSStore[])
        } else {
          setStores((data ?? []) as PSStore[])
        }
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Always show the "list your store" CTA, even if empty
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>🏪</span> Partner stores
        </p>
        {stores.length > 3 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium underline"
            style={{ color: '#e05a4e' }}
          >
            {expanded ? 'Show less' : `See all ${stores.length}`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-gray-300" />
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      ) : stores.length === 0 ? (
        <Link
          href="/stores/register"
          className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow"
        >
          <span className="text-2xl">🏪</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Own a pet store?</p>
            <p className="text-xs text-gray-400">Create your free store page and reach local adopters</p>
          </div>
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#e05a4e' }}>List it free →</span>
        </Link>
      ) : (
        <div className="space-y-2 mb-2">
          {(expanded ? stores : stores.slice(0, 3)).map(s => (
            <a
              key={s.id}
              href={`/stores/${s.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: s.cover_color }}>
                <span className="drop-shadow-sm">{s.logo}</span>
              </div>
              <div className="flex-1 min-w-0 py-2 pr-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                  {s.verified && <span className="text-[10px] text-emerald-600">✓</span>}
                  {s.featured && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                      ⭐ Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{s.city || '🌐 Online / ships nationwide'}</p>
                {s.specialties.length > 0 && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {s.specialties.slice(0, 3).join(' · ')}
                  </p>
                )}
              </div>
              <ExternalLink size={13} className="text-gray-300 mr-3 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      <div className="h-px bg-gray-200 mt-1 mb-1" />
    </div>
  )
}

const LOCATION_KEY = 'pawfect_city'

function readSavedLocation(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(LOCATION_KEY) ?? ''
}

function writeSavedLocation(city: string) {
  if (typeof window === 'undefined') return
  if (city.trim()) localStorage.setItem(LOCATION_KEY, city.trim())
  else localStorage.removeItem(LOCATION_KEY)
}

// ── Nearby stores section ──────────────────────────────────────────
function NearbyStores() {
  const supabase = createClient()
  type Status = 'loading-profile' | 'input' | 'geocoding' | 'fetching' | 'done' | 'error'
  const [status,       setStatus]       = useState<Status>('loading-profile')
  const [stores,       setStores]       = useState<Store[]>([])
  const [errorMsg,     setErrorMsg]     = useState('')
  const [showChains,   setShowChains]   = useState(false)
  const [cityInput,    setCityInput]    = useState('')
  const [stateInput,   setStateInput]   = useState('')
  const [resolvedCity, setResolvedCity] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Overpass (OpenStreetMap) is a free, shared resource that genuinely
  // 504s under real load (confirmed server-side: back-to-back requests
  // failed then succeeded). Routed through our own API route so it can
  // retry once and cache successful responses at the CDN — repeat/nearby
  // searches then never touch Overpass at all.
  const fetchStores = async (lat: number, lon: number) => {
    setStatus('fetching')
    try {
      // Round coordinates so nearby searches share the same CDN cache entry
      const p = new URLSearchParams({ lat: lat.toFixed(2), lon: lon.toFixed(2) })
      const res = await fetch(`/api/nearby-stores?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { stores: rawStores } = await res.json()
      const parsed: Store[] = (rawStores ?? [])
        .map((s: Store) => ({ ...s, distance: haversine(lat, lon, s.lat, s.lon) }))
        .sort((a: Store, b: Store) => a.distance - b.distance)
      setStores(parsed)
      setStatus('done')
    } catch {
      setStatus('error')
      setErrorMsg('Could not load nearby stores. Please try again.')
    }
  }

  const geocodeAndFetch = async (cityStr: string) => {
    const trimmed = cityStr.trim()
    if (!trimmed) return
    setStatus('geocoding')
    setResolvedCity(trimmed)
    try {
      const coords = await geocodeCity(trimmed)
      if (!coords) {
        setStatus('error')
        setErrorMsg(`Couldn't find "${trimmed}". Try "City, State" or a 5-digit zip code.`)
        return
      }
      // Save to shared location storage so home page + RescueGroups search stays in sync
      writeSavedLocation(trimmed)
      await fetchStores(coords.lat, coords.lon)
    } catch {
      setStatus('error')
      setErrorMsg('Could not look up that location. Check your connection and try again.')
    }
  }

  // On mount: check localStorage first, then fall back to profile city
  useEffect(() => {
    const init = async () => {
      // 1. Already-saved location (set from home page or previous shop search)
      const saved = readSavedLocation()
      if (saved) {
        const savedState = parseStateFromCity(saved)
        setCityInput(savedState ? stripStateFromCity(saved) : saved)
        setStateInput(savedState)
        geocodeAndFetch(saved)
        return
      }
      // 2. Profile city for logged-in users
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('city').eq('id', user.id).single()
        if (profile?.city) {
          const profileState = parseStateFromCity(profile.city)
          setCityInput(profileState ? stripStateFromCity(profile.city) : profile.city)
          setStateInput(profileState)
          geocodeAndFetch(profile.city)
          return
        }
      }
      setStatus('input') // no location anywhere — show manual input
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const independents = stores.filter(s => !s.chain)
  const chains       = stores.filter(s => s.chain)

  const searchBarProps = {
    city: cityInput,
    onCityChange: setCityInput,
    state: stateInput,
    onStateChange: setStateInput,
    // Zip codes have no state field to append; combining "City, ST" for
    // named-place searches is what actually fixes "location not found"
    // on ambiguous city names
    onSearch: () => geocodeAndFetch(stateInput && !/^\d{5}/.test(cityInput.trim()) ? `${cityInput}, ${stateInput}` : cityInput),
    searching: status === 'geocoding' || status === 'fetching',
    inputRef,
  }

  if (status === 'loading-profile') {
    return (
      <div className="bg-white rounded-2xl shadow-sm px-4 py-4 mb-3 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-gray-400 flex-shrink-0" />
        <p className="text-sm text-gray-500">Loading your location…</p>
      </div>
    )
  }

  if (status === 'input') {
    return (
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-1.5 px-1">🏪 Find pet stores near you</p>
        <CityStateSearch searchLabel="Find stores" {...searchBarProps} />
      </div>
    )
  }

  if (status === 'geocoding' || status === 'fetching') {
    return (
      <div className="bg-white rounded-2xl shadow-sm px-4 py-4 mb-3 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: '#e05a4e' }} />
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {status === 'geocoding' ? `Looking up ${resolvedCity}…` : 'Finding nearby stores…'}
          </p>
          <p className="text-xs text-gray-400">Just a moment</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mb-3">
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-2 flex items-start gap-2.5">
          <MapPin size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Location not found</p>
            <p className="text-xs text-red-500">{errorMsg}</p>
          </div>
        </div>
        <CityStateSearch searchLabel="Try again" {...searchBarProps} />
      </div>
    )
  }

  // done
  return (
    <div className="mb-3">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <MapPin size={14} style={{ color: '#e05a4e' }} />
          Near {resolvedCity}
        </p>
        <button
          onClick={() => { setStatus('input'); setStores([]); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="text-xs font-medium underline"
          style={{ color: '#e05a4e' }}
        >
          Change city
        </button>
      </div>

      {stores.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-5 text-center text-sm text-gray-400 mb-2">
          No pet stores found within 15 miles of {resolvedCity}.
        </div>
      )}

      {/* ── Local / independent stores ── */}
      {independents.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">🏪 Local shops first</span>
          </div>
          <div className="space-y-2 mb-3">
            {independents.slice(0, 5).map(store => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </>
      )}

      {/* ── Chain stores (collapsed by default) ── */}
      {chains.length > 0 && (
        <>
          <button
            onClick={() => setShowChains(v => !v)}
            className="flex items-center gap-1.5 mb-1.5 px-1 text-xs font-semibold text-gray-500"
          >
            {showChains ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {chains.length} chain store{chains.length !== 1 ? 's' : ''} nearby
          </button>
          {showChains && (
            <div className="space-y-2 mb-2">
              {chains.slice(0, 5).map(store => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="h-px bg-gray-200 mb-3" />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function ShopPage() {
  const [cat, setCat] = useState('all')
  const products = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat)

  return (
    <div className="app-shell-height flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🛍️</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Pawfect</span>
              <span className="text-gray-900"> Shop</span>
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">via Chewy</span>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-2">

          {/* Partner stores registered on Pawfect Match */}
          <PartnerStores />

          {/* Sponsored (house ad — admin-curated, pet-related only) */}
          <SponsoredBanner placement="shop" />

          {/* Nearby stores from OpenStreetMap */}
          <NearbyStores />

          {/* Category filter */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none px-1">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0 ${
                  cat === c.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={cat === c.value ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
              >
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            {products.map(p => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {/* What these links are — no affiliate tracking is attached to them.
              If affiliate links are added later, restore an FTC disclosure here. */}
          <p className="text-[10px] text-gray-400 text-center px-4 pb-4 pt-2 leading-relaxed">
            Product links open Chewy.com, where current prices, availability, and reviews are listed.
            Pawfect Match isn&apos;t paid for these links.
          </p>

        </div>{/* end scrollable */}

        <BottomNav />
      </div>
    </div>
  )
}
