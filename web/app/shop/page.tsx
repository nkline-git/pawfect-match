'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, ExternalLink, MapPin, Loader2, Phone, Globe, ChevronDown, ChevronUp, Search, Navigation } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import { createClient } from '@/lib/supabase/client'

// ── Known big-box chains ───────────────────────────────────────────
const CHAIN_NAMES = [
  'petsmart', 'petco', 'pet supplies plus', 'petvalu', 'pet valu',
  'pet supermarket', 'hollywood feed', 'unleashed', 'petland',
  'global pet foods', 'chuck & don', 'pet people', 'petshop',
]

function isChain(name: string) {
  const lower = name.toLowerCase()
  return CHAIN_NAMES.some(c => lower.includes(c))
}

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

type Product = {
  id: string; category: string; name: string; sub: string
  price: number; compare: number | null; emoji: string
  brand: string; rating: number; reviews: number
  badge: string | null; url: string
}

const PRODUCTS: Product[] = [
  { id:'1',  category:'food',     name:"Hill's Science Diet",          sub:'Adult Chicken & Barley',       price:5499, compare:6999, emoji:'🥩', brand:"Hill's",        rating:4.8, reviews:2341,  badge:'21% off',         url:'https://www.chewy.com/s?query=hills+science+diet' },
  { id:'2',  category:'food',     name:'Blue Buffalo Life Protection', sub:'Adult Chicken & Brown Rice',   price:4899, compare:5999, emoji:'🐟', brand:'Blue Buffalo',  rating:4.7, reviews:8142,  badge:'Best seller',     url:'https://www.chewy.com/s?query=blue+buffalo+life+protection' },
  { id:'3',  category:'food',     name:'Purina Pro Plan',              sub:'High Protein Salmon & Rice',   price:5299, compare:null, emoji:'🥣', brand:'Purina',        rating:4.9, reviews:15203, badge:'Vet recommended', url:'https://www.chewy.com/s?query=purina+pro+plan+salmon' },
  { id:'4',  category:'food',     name:'Royal Canin Indoor',           sub:'Adult Dry Cat Food',           price:4199, compare:4999, emoji:'🐱', brand:'Royal Canin',   rating:4.6, reviews:6782,  badge:null,              url:'https://www.chewy.com/s?query=royal+canin+indoor+adult' },
  { id:'5',  category:'toys',     name:'KONG Classic',                 sub:'Durable Rubber Chew Toy',      price:1299, compare:1699, emoji:'🎾', brand:'KONG',          rating:4.9, reviews:18432, badge:'#1 Best seller',  url:'https://www.chewy.com/s?query=kong+classic' },
  { id:'6',  category:'toys',     name:'Chuckit! Ultra Ball',          sub:'High Bounce Fetch Ball 2-pk',  price:899,  compare:null, emoji:'⚽', brand:'Chuckit!',      rating:4.8, reviews:5621,  badge:null,              url:'https://www.chewy.com/s?query=chuckit+ultra+ball' },
  { id:'7',  category:'toys',     name:'Nina Ottosson Dog Puzzle',     sub:'Interactive Level 2',          price:2299, compare:2799, emoji:'🧩', brand:'Outward Hound', rating:4.7, reviews:3104,  badge:'Staff pick',      url:'https://www.chewy.com/s?query=nina+ottosson+dog+puzzle' },
  { id:'8',  category:'toys',     name:'Yeowww! Catnip Banana',        sub:'Organic Catnip Toy',           price:799,  compare:null, emoji:'🍌', brand:'Yeowww!',       rating:4.8, reviews:9231,  badge:'Cat favorite',    url:'https://www.chewy.com/s?query=yeowww+catnip+banana' },
  { id:'9',  category:'beds',     name:'PetFusion Ultimate Lounge',    sub:'Memory Foam Dog Bed, Large',   price:8999, compare:10999,emoji:'🛏️', brand:'PetFusion',    rating:4.8, reviews:4892,  badge:'18% off',         url:'https://www.chewy.com/s?query=petfusion+ultimate+lounge' },
  { id:'10', category:'beds',     name:'K&H Thermo-Kitty Heated',      sub:'Self-Warming Cat Bed',         price:4499, compare:5499, emoji:'🌡️', brand:'K&H',          rating:4.6, reviews:2103,  badge:null,              url:'https://www.chewy.com/s?query=kh+thermo+kitty' },
  { id:'11', category:'grooming', name:'FURminator Deshedding Tool',   sub:'Long Hair Large Dog',          price:3299, compare:3999, emoji:'✂️', brand:'FURminator',   rating:4.7, reviews:22401, badge:'17% off',         url:'https://www.chewy.com/s?query=furminator+deshedding' },
  { id:'12', category:'grooming', name:"Burt's Bees Dog Shampoo",      sub:'Hypoallergenic, Tearless',     price:999,  compare:null, emoji:'🛁', brand:"Burt's Bees",   rating:4.6, reviews:3812,  badge:null,              url:'https://www.chewy.com/s?query=burts+bees+dog+shampoo' },
  { id:'13', category:'health',   name:'Zesty Paws Multivitamin',      sub:'Chewable Bites for Dogs',      price:2499, compare:2999, emoji:'💊', brand:'Zesty Paws',    rating:4.7, reviews:11234, badge:'Top pick',        url:'https://www.chewy.com/s?query=zesty+paws+multivitamin' },
  { id:'14', category:'health',   name:'Vetri-Science Composure',      sub:'Calming Supplement for Dogs',  price:1899, compare:null, emoji:'🌿', brand:'Vetri-Science',  rating:4.5, reviews:1823, badge:null,              url:'https://www.chewy.com/s?query=vetri+science+composure' },
  { id:'15', category:'travel',   name:'Kurgo Tru-Fit Harness',        sub:'Crash Tested Car Harness',     price:3499, compare:3999, emoji:'🚗', brand:'Kurgo',         rating:4.6, reviews:2891,  badge:null,              url:'https://www.chewy.com/s?query=kurgo+tru-fit+harness' },
  { id:'16', category:'travel',   name:'Ruffwear Front Range Pack',    sub:'Dog Hiking Backpack',          price:5999, compare:6999, emoji:'🎒', brand:'Ruffwear',      rating:4.8, reviews:1204,  badge:'14% off',         url:'https://www.chewy.com/s?query=ruffwear+front+range+pack' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10}
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  )
}

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// ── Nearby stores section ──────────────────────────────────────────
function NearbyStores() {
  const supabase = createClient()
  type Status = 'loading-profile' | 'input' | 'geocoding' | 'fetching' | 'done' | 'error'
  const [status,       setStatus]       = useState<Status>('loading-profile')
  const [stores,       setStores]       = useState<Store[]>([])
  const [errorMsg,     setErrorMsg]     = useState('')
  const [showChains,   setShowChains]   = useState(false)
  const [cityInput,    setCityInput]    = useState('')
  const [resolvedCity, setResolvedCity] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // On mount: pull city from profile and auto-search
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('city').eq('id', user.id).single()
        if (profile?.city) {
          setCityInput(profile.city)
          geocodeAndFetch(profile.city)
          return
        }
      }
      setStatus('input') // no profile city — show manual input
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geocodeAndFetch = async (cityStr: string) => {
    const trimmed = cityStr.trim()
    if (!trimmed) return
    setStatus('geocoding')
    setResolvedCity(trimmed)
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      )
      const geoJson = await geoRes.json()
      if (!geoJson.length) {
        setStatus('error')
        setErrorMsg(`Couldn't find "${trimmed}". Try a different city or zip code.`)
        return
      }
      await fetchStores(parseFloat(geoJson[0].lat), parseFloat(geoJson[0].lon))
    } catch {
      setStatus('error')
      setErrorMsg('Could not look up that location. Check your connection and try again.')
    }
  }

  const fetchStores = async (lat: number, lon: number) => {
    setStatus('fetching')
    try {
      const query = `[out:json][timeout:25];(node["shop"="pet"](around:24000,${lat},${lon});way["shop"="pet"](around:24000,${lat},${lon}););out center;`
      const res  = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: Store[] = (json.elements ?? []).map((el: any) => {
        const elLat = el.lat ?? el.center?.lat
        const elLon = el.lon ?? el.center?.lon
        const tags  = el.tags ?? {}
        const name  = tags.name ?? tags['name:en'] ?? 'Pet Store'
        const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean)
        return {
          id: el.id, name, lat: elLat, lon: elLon,
          distance: haversine(lat, lon, elLat, elLon),
          phone:   tags.phone ?? tags['contact:phone'],
          website: tags.website ?? tags['contact:website'],
          address: parts.length ? parts.join(' ') : undefined,
          chain:   isChain(name),
        } as Store
      }).filter((s: Store) => s.lat)
        .sort((a: Store, b: Store) => a.distance - b.distance)
      setStores(parsed)
      setStatus('done')
    } catch {
      setStatus('error')
      setErrorMsg('Could not load nearby stores. Please try again.')
    }
  }

  const independents = stores.filter(s => !s.chain)
  const chains       = stores.filter(s => s.chain)

  // City input field (shown when no profile city or user wants to change)
  const CitySearchBar = ({ label }: { label?: string }) => (
    <div className="flex gap-2 mb-3">
      <div className="flex-1 flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-2.5 border border-gray-200">
        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && geocodeAndFetch(cityInput)}
          placeholder="City or zip code…"
          className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
        />
      </div>
      <button
        onClick={() => geocodeAndFetch(cityInput)}
        disabled={!cityInput.trim()}
        className="px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5"
        style={{ backgroundColor: '#e05a4e' }}
      >
        <Search size={14} />{label ?? 'Search'}
      </button>
    </div>
  )

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
        <CitySearchBar label="Find stores" />
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
        <CitySearchBar label="Try again" />
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

function StoreCard({ store }: { store: Store }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`

  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{store.name}</p>
          {store.address && <p className="text-xs text-gray-400 truncate">{store.address}</p>}
        </div>
        <div className="flex flex-col items-end flex-shrink-0 gap-1">
          <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>{fmtMiles(store.distance)}</span>
          {!store.chain && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Local</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
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
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function ShopPage() {
  const [cat, setCat] = useState('all')
  const products = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat)

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px] flex flex-col" style={{ minHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🛍️</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Pawfect</span>
              <span className="text-gray-900"> Shop</span>
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">via Chewy</span>
        </header>

        {/* Nearby stores */}
        <NearbyStores />

        {/* Discount banner */}
        <div
          className="rounded-2xl p-4 mb-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#e05a4e,#c44b40)' }}
        >
          <span className="text-4xl">🐾</span>
          <div className="text-white">
            <p className="font-bold text-sm">New adopter discount</p>
            <p className="text-xs opacity-80">20% off your first order with code <strong>PAWFECT20</strong></p>
          </div>
        </div>

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
        <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
          {products.map(p => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="h-28 flex items-center justify-center bg-gray-50 relative">
                <span className="text-5xl">{p.emoji}</span>
                {p.badge && (
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: p.badge.includes('%') ? '#22c55e' : '#e05a4e' }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-[10px] text-gray-400 mb-0.5">{p.brand}</p>
                <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
                <p className="text-[10px] text-gray-400 line-clamp-1 mb-1.5">{p.sub}</p>
                <div className="flex items-center gap-1 mb-1.5">
                  <Stars rating={p.rating} />
                  <span className="text-[10px] text-gray-400">({p.reviews.toLocaleString()})</span>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{fmt(p.price)}</span>
                    {p.compare && <span className="text-[10px] text-gray-400 line-through">{fmt(p.compare)}</span>}
                  </div>
                  <div
                    className="mt-1.5 w-full py-1.5 rounded-xl text-white text-[11px] font-semibold text-center flex items-center justify-center gap-1"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    Shop on Chewy <ExternalLink size={9} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
