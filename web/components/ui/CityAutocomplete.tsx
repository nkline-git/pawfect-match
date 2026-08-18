'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

type Suggestion = { key: string; label: string }

// City input with validated suggestions from Nominatim (OpenStreetMap).
// Free typing still works, but picking a suggestion guarantees a value the
// geocoder can resolve — typos and unknown towns break radius search.
export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'San Diego, CA',
}: {
  value: string
  onChange: (city: string) => void
  placeholder?: string
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open,        setOpen]        = useState(false)
  const [highlight,   setHighlight]   = useState(-1)
  const skipNextFetch = useRef(false)
  const containerRef  = useRef<HTMLDivElement>(null)

  // Debounced suggestion fetch as the user types
  useEffect(() => {
    if (skipNextFetch.current) { skipNextFetch.current = false; return }
    const q = value.trim()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q, format: 'json', limit: '5', countrycodes: 'us',
          addressdetails: '1', featuretype: 'city',
        })
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'Accept-Language': 'en-US,en' } })
        const json = await res.json()
        const seen = new Set<string>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: Suggestion[] = (Array.isArray(json) ? json : []).map((r: any) => {
          const a = r.address ?? {}
          const city = a.city ?? a.town ?? a.village ?? r.name
          // "US-KS" → "KS"
          const stateIso = typeof a['ISO3166-2-lvl4'] === 'string' ? a['ISO3166-2-lvl4'].split('-')[1] : null
          return {
            key:   String(r.place_id),
            label: city ? (stateIso ? `${city}, ${stateIso}` : city) : String(r.display_name),
          }
        }).filter((s: Suggestion) => {
          if (!s.label || seen.has(s.label)) return false
          seen.add(s.label)
          return true
        })
        setSuggestions(items)
        setOpen(items.length > 0)
        setHighlight(-1)
      } catch { /* suggestions are best-effort — manual input still works */ }
    }, 350)
    return () => clearTimeout(timer)
  }, [value])

  // Close when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const select = (s: Suggestion) => {
    skipNextFetch.current = true
    onChange(s.label)
    setOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % suggestions.length) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => (h - 1 + suggestions.length) % suggestions.length) }
    if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); select(suggestions[highlight]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={e => { e.target.style.borderColor = '#e05a4e'; if (suggestions.length > 0) setOpen(true) }}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
      />
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.key}
              type="button"
              // mousedown so selection wins over the input's blur
              onMouseDown={e => { e.preventDefault(); select(s) }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                i === highlight ? 'bg-red-50 text-gray-900' : 'text-gray-700'
              }`}
            >
              <MapPin size={13} className="text-gray-400 flex-shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
