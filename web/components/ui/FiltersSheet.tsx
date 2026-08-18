'use client'

import { useState, useRef, useEffect } from 'react'
import { X, RotateCcw, Plus, PawPrint } from 'lucide-react'
import { SIZE_OPTIONS, ENERGY_OPTIONS, HOUSING_OPTIONS, GOOD_WITH_OPTIONS, POPULAR_BREEDS, matchBreeds } from '@/lib/petOptions'
import type { PetPreferences } from '@/types'

const EMPTY_PREFS: PetPreferences = {
  species: [], breeds: [], size: [], age: [], energy: [],
  good_with_kids: null, good_with_dogs: null, good_with_cats: null, housing: null,
}

type GoodWithField = 'good_with_kids' | 'good_with_dogs' | 'good_with_cats'

export default function FiltersSheet({
  initialPrefs, initialRadius, onApply, onClose,
}: {
  initialPrefs: PetPreferences | null
  initialRadius: number
  onApply: (prefs: PetPreferences, radius: number) => void
  onClose: () => void
}) {
  const [prefs, setPrefs]       = useState<PetPreferences>(initialPrefs ?? EMPTY_PREFS)
  const [radius, setRadius]     = useState(initialRadius)
  const [breedInput, setBreedInput] = useState('')
  const [breedSuggestOpen, setBreedSuggestOpen] = useState(false)
  const [breedHighlight, setBreedHighlight] = useState(-1)
  const breedBoxRef = useRef<HTMLDivElement>(null)
  const breedMatches = matchBreeds(breedInput, prefs.breeds)

  // Close the breed dropdown on an outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (breedBoxRef.current && !breedBoxRef.current.contains(e.target as Node)) setBreedSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const toggleSize = (value: string) =>
    setPrefs(p => ({ ...p, size: p.size.includes(value) ? p.size.filter(v => v !== value) : [...p.size, value] }))

  const toggleEnergy = (value: string) =>
    setPrefs(p => ({ ...p, energy: p.energy.includes(value) ? p.energy.filter(v => v !== value) : [...p.energy, value] }))

  const toggleGoodWith = (field: GoodWithField) =>
    setPrefs(p => ({ ...p, [field]: p[field] === true ? null : true }))

  const toggleHousing = (value: string) =>
    setPrefs(p => ({ ...p, housing: p.housing === value ? null : value }))

  const addBreed = (breed: string) => {
    const trimmed = breed.trim()
    if (!trimmed || prefs.breeds.includes(trimmed)) return
    setPrefs(p => ({ ...p, breeds: [...p.breeds, trimmed] }))
    setBreedInput('')
    setBreedSuggestOpen(false)
    setBreedHighlight(-1)
  }
  const removeBreed = (breed: string) =>
    setPrefs(p => ({ ...p, breeds: p.breeds.filter(b => b !== breed) }))

  const activeCount =
    prefs.size.length + prefs.energy.length + prefs.breeds.length +
    (prefs.housing ? 1 : 0) +
    [prefs.good_with_kids, prefs.good_with_dogs, prefs.good_with_cats].filter(v => v === true).length

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
      active ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
    }`
  const chipStyle = (active: boolean) => active ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Filters</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
          {/* Search radius */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Search radius — <span style={{ color: '#e05a4e' }}>{radius} miles</span>
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full accent-[#e05a4e]"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
              <span>10 mi</span>
              <span>500 mi</span>
            </div>
          </div>

          {/* Size */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => toggleSize(o.value)}
                  className={chipClass(prefs.size.includes(o.value))}
                  style={chipStyle(prefs.size.includes(o.value))}
                >
                  {o.label} <span className="opacity-70">· {o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Energy level</p>
            <div className="flex flex-wrap gap-2">
              {ENERGY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => toggleEnergy(o.value)}
                  className={chipClass(prefs.energy.includes(o.value))}
                  style={chipStyle(prefs.energy.includes(o.value))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Housing */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Your home</p>
            <div className="flex flex-wrap gap-2">
              {HOUSING_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => toggleHousing(o.value)}
                  className={chipClass(prefs.housing === o.value)}
                  style={chipStyle(prefs.housing === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Good with */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Must be good with</p>
            <div className="flex flex-wrap gap-2">
              {GOOD_WITH_OPTIONS.map(o => (
                <button
                  key={o.field}
                  onClick={() => toggleGoodWith(o.field)}
                  className={chipClass(prefs[o.field] === true)}
                  style={chipStyle(prefs[o.field] === true)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breeds */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Breeds <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            {prefs.breeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {prefs.breeds.map(b => (
                  <span
                    key={b}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    {b}
                    <button onClick={() => removeBreed(b)} className="opacity-70 hover:opacity-100 transition-opacity">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div ref={breedBoxRef} className="relative flex gap-2 mb-2">
              <input
                type="text"
                value={breedInput}
                onChange={e => { setBreedInput(e.target.value); setBreedSuggestOpen(true); setBreedHighlight(-1) }}
                onFocus={() => { if (breedMatches.length > 0) setBreedSuggestOpen(true) }}
                onKeyDown={e => {
                  if (breedSuggestOpen && breedMatches.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setBreedHighlight(h => (h + 1) % breedMatches.length); return }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setBreedHighlight(h => (h - 1 + breedMatches.length) % breedMatches.length); return }
                    if (e.key === 'Escape')    { setBreedSuggestOpen(false); return }
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addBreed(breedHighlight >= 0 ? breedMatches[breedHighlight] : breedInput)
                  }
                }}
                placeholder="Type a breed — we'll catch typos…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
              />
              <button
                onClick={() => addBreed(breedInput)}
                disabled={!breedInput.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
                style={{ backgroundColor: '#e05a4e' }}
              >
                <Plus size={16} />
              </button>

              {breedSuggestOpen && breedMatches.length > 0 && (
                <div className="absolute z-10 left-0 right-11 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  {breedMatches.map((b, i) => (
                    <button
                      key={b}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); addBreed(b) }}
                      onMouseEnter={() => setBreedHighlight(i)}
                      className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                        i === breedHighlight ? 'bg-red-50 text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      <PawPrint size={13} className="text-gray-400 flex-shrink-0" />
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {POPULAR_BREEDS.filter(b => !prefs.breeds.includes(b)).map(b => (
                <button
                  key={b}
                  onClick={() => addBreed(b)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100 whitespace-nowrap"
                >
                  + {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => { setPrefs(EMPTY_PREFS); setRadius(100) }}
            disabled={activeCount === 0 && radius === 100}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={() => onApply(prefs, radius)}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#e05a4e' }}
          >
            Show matching pets{activeCount > 0 ? ` (${activeCount} filter${activeCount === 1 ? '' : 's'})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
