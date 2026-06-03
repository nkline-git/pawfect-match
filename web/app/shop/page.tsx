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

// ── Product photos: Unsplash (emoji fallback on load error) ────────
const PRODUCT_PHOTOS: Record<string, string> = {
  '1':  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=280&fit=crop&q=80', // dog at bowl
  '2':  'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&h=280&fit=crop&q=80', // dog eating
  '3':  'https://images.unsplash.com/photo-1589924691995-400dc9a3fb8e?w=400&h=280&fit=crop&q=80', // pet food
  '4':  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=280&fit=crop&q=80', // cat close-up
  '5':  'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&h=280&fit=crop&q=80', // dog with toy
  '6':  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=280&fit=crop&q=80',    // golden retriever
  '7':  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=280&fit=crop&q=80',    // two huskies
  '8':  'https://images.unsplash.com/photo-1560743641-3914f2c45636?w=400&h=280&fit=crop&q=80',    // cat lying
  '9':  'https://images.unsplash.com/photo-1583511655826-05700442b31b?w=400&h=280&fit=crop&q=80', // dog in bed
  '10': 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?w=400&h=280&fit=crop&q=80', // sleeping cat
  '11': 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=400&h=280&fit=crop&q=80', // dog groomed
  '12': 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=400&h=280&fit=crop&q=80', // dog bath
  '13': 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=280&fit=crop&q=80', // vet with dog
  '14': 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=280&fit=crop&q=80', // calm dogs
  '15': 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400&h=280&fit=crop&q=80', // dog in car
  '16': 'https://images.unsplash.com/photo-1508068096726-f4c7c7d68696?w=400&h=280&fit=crop&q=80', // dog hiking
}

// ── Star rating ────────────────────────────────────────────────────
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

// ── Product card ───────────────────────────────────────────────────
function ProductCard({ p }: { p: Product }) {
  const [imgOk, setImgOk] = useState(true)
  const photo = PRODUCT_PHOTOS[p.id]

  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer"
      className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
    >
      <div className="h-32 relative overflow-hidden bg-gray-50">
        {photo && imgOk ? (
          <img
            src={photo}
            alt={p.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{p.emoji}</span>
          </div>
        )}
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
          <img
            src={mapUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
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
  type PSStore = { id: string; name: string; city: string; logo: string; cover_color: string; specialties: string[]; hours: string | null; verified: boolean }
  const [stores,   setStores]   = useState<PSStore[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    supabase
      .from('pet_stores')
      .select('id, name, city, logo, cover_color, specialties, hours, verified')
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setStores((data ?? []) as PSStore[])
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
      ) : stores.length === 0 ? null : (
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
                </div>
                <p className="text-xs text-gray-400 truncate">{s.city}</p>
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

      {/* CTA for store owners */}
      <a
        href="/stores/register"
        className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm border border-dashed border-gray-200 hover:border-[#e05a4e] transition-colors group"
      >
        <span className="text-2xl">🏪</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#e05a4e] transition-colors">
            Own a pet store? List it free →
          </p>
          <p className="text-xs text-gray-400">Get discovered by local pet owners</p>
        </div>
      </a>

      <div className="h-px bg-gray-200 mt-3 mb-1" />
    </div>
  )
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

// ── Main page ──────────────────────────────────────────────────────
export default function ShopPage() {
  const [cat, setCat] = useState('all')
  const products = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat)

  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
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

          {/* Nearby stores from OpenStreetMap */}
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
          <div className="grid grid-cols-2 gap-3 pb-2">
            {products.map(p => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

        </div>{/* end scrollable */}

        <BottomNav />
      </div>
    </div>
  )
}
