'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2 } from 'lucide-react'
import type { PetPreferences } from '@/types'
import { PENDING_PREFS_KEY } from '@/types'

// ── Step definitions ─────────────────────────────────────────────

const STEPS = ['pet_type', 'size', 'energy', 'housing', 'good_with'] as const
type Step = typeof STEPS[number]

const STEP_ICONS: Record<Step, string> = {
  pet_type: '🐾', size: '📏', energy: '⚡', housing: '🏠', good_with: '🤝',
}

const SPECIES_OPTIONS = [
  { value: 'dog',          label: 'Dogs',          icon: '🐕' },
  { value: 'cat',          label: 'Cats',           icon: '🐱' },
  { value: 'rabbit',       label: 'Rabbits',        icon: '🐰' },
  { value: 'bird',         label: 'Birds',          icon: '🦜' },
  { value: 'small_animal', label: 'Small animals',  icon: '🐹' },
  { value: 'other',        label: 'Other',          icon: '🐾' },
]

const SIZE_OPTIONS = [
  { value: 'Small',  label: 'Small',  sub: '< 25 lbs',  icon: '🐾' },
  { value: 'Medium', label: 'Medium', sub: '25–60 lbs', icon: '🐾🐾' },
  { value: 'Large',  label: 'Large',  sub: '60–90 lbs', icon: '🐾🐾🐾' },
  { value: 'XL',     label: 'XL',     sub: '90+ lbs',   icon: '🐾🐾🐾🐾' },
]

const ENERGY_OPTIONS = [
  { value: 'Low',       label: 'Couch companion', sub: 'Loves naps',        icon: '🛋️' },
  { value: 'Medium',    label: 'Daily walks',     sub: 'Active but chill',  icon: '🚶' },
  { value: 'High',      label: 'Adventure buddy', sub: 'Always on the go',  icon: '🏃' },
  { value: 'Very High', label: 'Extreme athlete', sub: 'Needs lots of room', icon: '⚡' },
]

const HOUSING_OPTIONS = [
  { value: 'apartment', label: 'Apartment',        icon: '🏢' },
  { value: 'house',     label: 'House with yard',  icon: '🏠' },
  { value: 'farm',      label: 'Farm / rural',     icon: '🌾' },
]

const GOOD_WITH_OPTIONS = [
  { field: 'good_with_kids' as const,  label: 'Kids',        icon: '👧' },
  { field: 'good_with_dogs' as const,  label: 'Other dogs',  icon: '🐕' },
  { field: 'good_with_cats' as const,  label: 'Other cats',  icon: '🐱' },
]

const STEP_TITLES: Record<Step, string> = {
  pet_type:  'What kind of furever friend?',
  size:      'What size fits your life?',
  energy:    'How active are you?',
  housing:   'Where do you live?',
  good_with: 'Any must-haves?',
}

const STEP_SUBS: Record<Step, string> = {
  pet_type:  'Choose all that interest you',
  size:      'Choose all that work for you',
  energy:    'Pick the energy that matches yours',
  housing:   'Your living situation helps us find the right fit',
  good_with: "Select anything that's important to you",
}

// ── Component ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  // Wizard is for first-time setup only (no preferences yet). Returning
  // users land on a menu of categories instead — nothing resets, and
  // each category is edited and saved independently.
  const [loadingPrefs,     setLoadingPrefs]     = useState(true)
  const [hasExistingPrefs, setHasExistingPrefs] = useState(false)
  const [editingStep,      setEditingStep]      = useState<Step | null>(null)

  const [stepIdx,   setStepIdx]   = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Preferences state — shared by the first-time wizard and the
  // returning-user category editor
  const [species,         setSpecies]        = useState<string[]>([])
  const [size,            setSize]           = useState<string[]>([])
  const [energy,          setEnergy]         = useState<string[]>([])
  const [housing,         setHousing]        = useState<string | null>(null)
  const [goodWithKids,    setGoodWithKids]   = useState<boolean | null>(null)
  const [goodWithDogs,    setGoodWithDogs]   = useState<boolean | null>(null)
  const [goodWithCats,    setGoodWithCats]   = useState<boolean | null>(null)

  // Last-saved snapshot — lets "Back" from a category discard unsaved
  // edits to just that category's field(s) without touching the rest
  const savedPrefsRef = useRef<PetPreferences | null>(null)

  const step    = STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === STEPS.length - 1

  const applyPrefsToState = (prefs: PetPreferences) => {
    setSpecies(prefs.species ?? [])
    setSize(prefs.size ?? [])
    setEnergy(prefs.energy ?? [])
    setHousing(prefs.housing ?? null)
    setGoodWithKids(prefs.good_with_kids ?? null)
    setGoodWithDogs(prefs.good_with_dogs ?? null)
    setGoodWithCats(prefs.good_with_cats ?? null)
  }

  // Auth + existing-preferences fetch
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', data.user.id)
        .maybeSingle()
      if (profile?.preferences) {
        savedPrefsRef.current = profile.preferences as PetPreferences
        applyPrefsToState(profile.preferences as PetPreferences)
        setHasExistingPrefs(true)
      }
      setLoadingPrefs(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toggle helpers
  const toggleMulti = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  const buildPrefsObject = (): PetPreferences => ({
    species,
    breeds: savedPrefsRef.current?.breeds ?? [],   // set per-breed preferences in profile settings
    size,
    age: savedPrefsRef.current?.age ?? [],         // age filter not in quiz — feed shows all ages
    energy,
    good_with_kids: goodWithKids,
    good_with_dogs: goodWithDogs,
    good_with_cats: goodWithCats,
    housing,
  })

  // First-time wizard finish — creates preferences for a user who has none
  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const prefs = buildPrefsObject()

    // A bare upsert({ id, preferences }) fails the profiles NOT NULL
    // constraints (first_name, city) even when the row exists, so:
    // existing profile → plain UPDATE; no profile yet (new OAuth users) →
    // stash the prefs and let the profile-setup save persist them.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: prefs })
        .eq('id', user.id)
      setSaving(false)
      if (error) { setSaveError(`Could not save preferences: ${error.message}`); return }
      router.push('/')
    } else {
      try { localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(prefs)) } catch { /* noop */ }
      setSaving(false)
      router.push('/profile')
    }
  }

  // Returning-user category save — persists the full preferences object
  // (every other category already holds its previously-saved value, so
  // this is equivalent to a per-field merge) and returns to the menu
  const saveCategory = async () => {
    setSaving(true)
    setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const prefs = buildPrefsObject()
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', user.id)

    setSaving(false)
    if (error) { setSaveError(`Could not save: ${error.message}`); return }
    savedPrefsRef.current = prefs
    setEditingStep(null)
  }

  // Discard unsaved edits to the category being closed, revert just its
  // field(s) back to the last-saved snapshot
  const cancelCategory = () => {
    const saved = savedPrefsRef.current
    if (saved) {
      if (editingStep === 'pet_type')  setSpecies(saved.species ?? [])
      if (editingStep === 'size')      setSize(saved.size ?? [])
      if (editingStep === 'energy')    setEnergy(saved.energy ?? [])
      if (editingStep === 'housing')   setHousing(saved.housing ?? null)
      if (editingStep === 'good_with') {
        setGoodWithKids(saved.good_with_kids ?? null)
        setGoodWithDogs(saved.good_with_dogs ?? null)
        setGoodWithCats(saved.good_with_cats ?? null)
      }
    }
    setSaveError(null)
    setEditingStep(null)
  }

  const canAdvance = () => true // every step is optional ("open to all")

  // ── Shared step-content renderer (used by both the wizard and the
  //    single-category editor so the UI never drifts between the two) ──
  const renderStepContent = (s: Step) => (
    <>
      {/* ── Species ── */}
      {s === 'pet_type' && (
        <div className="grid grid-cols-2 gap-2.5">
          {SPECIES_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => toggleMulti(o.value, species, setSpecies)}
              className={`relative flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                species.includes(o.value)
                  ? 'border-transparent'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
              style={species.includes(o.value) ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
            >
              {species.includes(o.value) && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]"
                  style={{ backgroundColor: '#e05a4e' }}>
                  <Check size={10} />
                </span>
              )}
              <span className="text-3xl">{o.icon}</span>
              <span className="text-sm font-medium text-gray-700">{o.label}</span>
            </button>
          ))}
          <p className="col-span-2 text-center text-xs text-gray-400 mt-1">
            Select none to see all types
          </p>
        </div>
      )}

      {/* ── Size ── */}
      {s === 'size' && (
        <div className="space-y-2.5">
          {SIZE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => toggleMulti(o.value, size, setSize)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                size.includes(o.value)
                  ? 'border-transparent'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
              style={size.includes(o.value) ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
            >
              <span className="text-lg w-14 text-left">{o.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-800 text-sm">{o.label}</p>
                <p className="text-xs text-gray-400">{o.sub}</p>
              </div>
              {size.includes(o.value) && (
                <Check size={16} style={{ color: '#e05a4e' }} />
              )}
            </button>
          ))}
          <p className="text-center text-xs text-gray-400 mt-1">
            Select none for any size
          </p>
        </div>
      )}

      {/* ── Energy ── */}
      {s === 'energy' && (
        <div className="space-y-2.5">
          {ENERGY_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => toggleMulti(o.value, energy, setEnergy)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                energy.includes(o.value)
                  ? 'border-transparent'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
              style={energy.includes(o.value) ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
            >
              <span className="text-2xl">{o.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-800 text-sm">{o.label}</p>
                <p className="text-xs text-gray-400">{o.sub}</p>
              </div>
              {energy.includes(o.value) && (
                <Check size={16} style={{ color: '#e05a4e' }} />
              )}
            </button>
          ))}
          <p className="text-center text-xs text-gray-400 mt-1">
            Select none for any energy level
          </p>
        </div>
      )}

      {/* ── Housing ── */}
      {s === 'housing' && (
        <div className="space-y-2.5">
          {HOUSING_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setHousing(housing === o.value ? null : o.value)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                housing === o.value
                  ? 'border-transparent'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
              style={housing === o.value ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
            >
              <span className="text-2xl">{o.icon}</span>
              <span className={`flex-1 text-left font-medium text-sm ${housing === o.value ? 'text-gray-900' : 'text-gray-700'}`}>
                {o.label}
              </span>
              {housing === o.value && (
                <Check size={16} style={{ color: '#e05a4e' }} />
              )}
            </button>
          ))}
          <button
            onClick={() => setHousing(null)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
              housing === null
                ? 'border-transparent'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
            }`}
            style={housing === null ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
          >
            <span className="text-2xl">🤷</span>
            <span className={`flex-1 text-left font-medium text-sm ${housing === null ? 'text-gray-900' : 'text-gray-700'}`}>
              No preference
            </span>
            {housing === null && (
              <Check size={16} style={{ color: '#e05a4e' }} />
            )}
          </button>
        </div>
      )}

      {/* ── Good with ── */}
      {s === 'good_with' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-1">
            Tap to require. Leave untapped if it doesn&apos;t matter.
          </p>
          {GOOD_WITH_OPTIONS.map(o => {
            const value =
              o.field === 'good_with_kids' ? goodWithKids :
              o.field === 'good_with_dogs' ? goodWithDogs : goodWithCats
            const setter =
              o.field === 'good_with_kids' ? setGoodWithKids :
              o.field === 'good_with_dogs' ? setGoodWithDogs : setGoodWithCats

            return (
              <button
                key={o.field}
                onClick={() => setter(value === true ? null : true)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all ${
                  value === true
                    ? 'border-transparent'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
                style={value === true ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e' } : {}}
              >
                <span className="text-2xl">{o.icon}</span>
                <span className="flex-1 text-left font-medium text-sm text-gray-700">
                  Must be good with {o.label.toLowerCase()}
                </span>
                {value === true && (
                  <Check size={16} style={{ color: '#e05a4e' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )

  // ── Category summaries for the menu ───────────────────────────────
  const categorySummary = (s: Step): string => {
    if (s === 'pet_type')
      return species.length ? species.map(v => SPECIES_OPTIONS.find(o => o.value === v)?.label ?? v).join(', ') : 'Any type'
    if (s === 'size')
      return size.length ? size.join(', ') : 'Any size'
    if (s === 'energy')
      return energy.length ? energy.join(', ') : 'Any energy level'
    if (s === 'housing')
      return housing ? HOUSING_OPTIONS.find(o => o.value === housing)?.label ?? housing : 'No preference'
    // good_with
    const reqs = GOOD_WITH_OPTIONS.filter(o =>
      (o.field === 'good_with_kids' ? goodWithKids : o.field === 'good_with_dogs' ? goodWithDogs : goodWithCats) === true
    ).map(o => o.label)
    return reqs.length ? `Good with ${reqs.join(', ')}` : 'No requirements'
  }

  if (loadingPrefs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  // ── Returning user: category menu ──────────────────────────────────
  if (hasExistingPrefs && editingStep === null) {
    return (
      <div className="min-h-screen flex items-start justify-center py-6 px-4">
        <div className="w-full max-w-[390px]">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/')}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Your pet preferences</h1>
              <p className="text-white/70 text-sm">Tap a category to change it</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-2 space-y-1">
            {STEPS.map(s => (
              <button
                key={s}
                onClick={() => setEditingStep(s)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-2xl flex-shrink-0">{STEP_ICONS[s]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{STEP_TITLES[s]}</p>
                  <p className="text-xs text-gray-400 truncate">{categorySummary(s)}</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Returning user: single-category editor ─────────────────────────
  if (hasExistingPrefs && editingStep !== null) {
    return (
      <div className="min-h-screen flex items-start justify-center py-6 px-4">
        <div className="w-full max-w-[390px]">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={cancelCategory}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{STEP_TITLES[editingStep]}</h1>
              <p className="text-white/70 text-sm">{STEP_SUBS[editingStep]}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            {renderStepContent(editingStep)}
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {saveError}
            </div>
          )}

          <button
            onClick={saveCategory}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ backgroundColor: '#e05a4e' }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Save</>}
          </button>
        </div>
      </div>
    )
  }

  // ── First-time setup: linear wizard (unchanged) ─────────────────────
  return (
    <div className="min-h-screen flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-[390px]">

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= stepIdx ? '#e05a4e' : '#e5e7eb' }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-1">Step {stepIdx + 1} of {STEPS.length}</p>
          <h1 className="text-2xl font-bold text-white">{STEP_TITLES[step]}</h1>
          <p className="text-white/70 text-sm mt-1">{STEP_SUBS[step]}</p>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          {renderStepContent(step)}
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {saveError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={() => setStepIdx(i => i - 1)}
              className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#e05a4e' }}
            >
              {saving
                ? <Loader2 size={18} className="animate-spin" />
                : <><Check size={18} /> Save my preferences</>
              }
            </button>
          ) : (
            <button
              onClick={() => setStepIdx(i => i + 1)}
              disabled={!canAdvance()}
              className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ backgroundColor: '#e05a4e' }}
            >
              Next <ArrowRight size={18} />
            </button>
          )}
        </div>

        <p
          className="text-center text-sm text-white/60 mt-4 cursor-pointer hover:text-white/80 transition-colors"
          onClick={() => router.push('/')}
        >
          Skip for now →
        </p>

      </div>
    </div>
  )
}
