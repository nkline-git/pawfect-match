'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Search } from 'lucide-react'
import { US_STATES } from '@/lib/usStates'

type Suggestion = { key: string; city: string; state: string }

// City input (with live suggestions) + state dropdown, combined into one
// query when searching. Pairing a state with the city name resolves the
// "location not found" errors that plain free-text city search hits on
// common names ("Springfield", "Franklin", …) that exist in a dozen states.
export default function CityStateSearch({
  city, onCityChange, state, onStateChange, onSearch, searching, searchLabel, inputRef,
}: {
  city: string
  onCityChange: (v: string) => void
  state: string
  onStateChange: (v: string) => void
  onSearch: () => void
  searching?: boolean
  searchLabel?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open,        setOpen]        = useState(false)
  const [highlight,   setHighlight]   = useState(-1)
  const skipNextFetch = useRef(false)
  const containerRef  = useRef<HTMLDivElement>(null)

  // Debounced suggestions, biased toward the selected state when present
  useEffect(() => {
    if (skipNextFetch.current) { skipNextFetch.current = false; return }
    const q = city.trim()
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: state ? `${q}, ${state}` : q,
          format: 'json', limit: '5', countrycodes: 'us',
          addressdetails: '1', featuretype: 'city',
        })
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'Accept-Language': 'en-US,en' } })
        const json = await res.json()
        const seen = new Set<string>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: Suggestion[] = (Array.isArray(json) ? json : []).map((r: any) => {
          const a = r.address ?? {}
          const cityName = a.city ?? a.town ?? a.village ?? r.name
          const stateAbbr = typeof a['ISO3166-2-lvl4'] === 'string' ? a['ISO3166-2-lvl4'].split('-')[1] : ''
          return { key: String(r.place_id), city: cityName ?? String(r.display_name), state: stateAbbr }
        }).filter((s: Suggestion) => {
          const dedupeKey = `${s.city}|${s.state}`
          if (!s.city || seen.has(dedupeKey)) return false
          seen.add(dedupeKey)
          return true
        })
        setSuggestions(items)
        setOpen(items.length > 0)
        setHighlight(-1)
      } catch { /* suggestions are best-effort — manual input + search still works */ }
    }, 350)
    return () => clearTimeout(timer)
  }, [city, state])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const select = (s: Suggestion) => {
    skipNextFetch.current = true
    onCityChange(s.city)
    if (s.state) onStateChange(s.state)
    setOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!open || highlight < 0)) { onSearch(); return }
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % suggestions.length) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => (h - 1 + suggestions.length) % suggestions.length) }
    if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); select(suggestions[highlight]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="flex gap-2 mb-3 min-w-0">
      <div ref={containerRef} className="relative flex-1 min-w-0 flex items-stretch bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-3 pr-1 py-2.5">
          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={city}
            onChange={e => onCityChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            placeholder="City or zip code…"
            className="flex-1 min-w-0 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
          />
        </div>
        <select
          value={state}
          onChange={e => onStateChange(e.target.value)}
          className="flex-shrink-0 w-[4.5rem] border-l border-gray-200 pl-2 pr-1 text-sm text-gray-600 outline-none bg-transparent appearance-none"
          aria-label="State"
        >
          <option value="">State</option>
          {US_STATES.map(s => (
            <option key={s.abbr} value={s.abbr}>{s.abbr}</option>
          ))}
        </select>

        {open && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={e => { e.preventDefault(); select(s) }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                  i === highlight ? 'bg-red-50 text-gray-900' : 'text-gray-700'
                }`}
              >
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                {s.city}{s.state ? `, ${s.state}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onSearch}
        disabled={!city.trim() || searching}
        className="px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
        style={{ backgroundColor: '#e05a4e' }}
      >
        <Search size={14} />{searchLabel ?? 'Search'}
      </button>
    </div>
  )
}
