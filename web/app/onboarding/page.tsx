'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import type { PetPreferences } from '@/types'

// ── Step definitions ─────────────────────────────────────────────

const STEPS = ['pet_type', 'size', 'energy', 'housing', 'good_with'] as const
type Step = typeof STEPS[number]

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

  const [stepIdx, setStepIdx] = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Preferences state
  const [species,         setSpecies]        = useState<string[]>([])
  const [size,            setSize]           = useState<string[]>([])
  const [energy,          setEnergy]         = useState<string[]>([])
  const [housing,         setHousing]        = useState<string | null>(null)
  const [goodWithKids,    setGoodWithKids]   = useState<boolean | null>(null)
  const [goodWithDogs,    setGoodWithDogs]   = useState<boolean | null>(null)
  const [goodWithCats,    setGoodWithCats]   = useState<boolean | null>(null)

  const step    = STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === STEPS.length - 1

  // Redirect if not logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
    })
  }, [supabase, router])

  // Toggle helpers
  const toggleMulti = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const prefs: PetPreferences = {
      species,
      size,
      age:            [],   // age filter not in quiz — feed shows all ages
      energy,
      good_with_kids: goodWithKids,
      good_with_dogs: goodWithDogs,
      good_with_cats: goodWithCats,
      housing,
    }

    await supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', user.id)

    setSaving(false)

    // If they don't have a full profile yet, send there; otherwise home
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.first_name) {
      router.push('/profile')
    } else {
      router.push('/')
    }
  }

  const canAdvance = () => {
    if (step === 'pet_type') return true  // species is optional ("open to all")
    if (step === 'size')     return true
    if (step === 'energy')   return true
    if (step === 'housing')  return true
    return true  // good_with is always optional
  }

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

          {/* ── Species ── */}
          {step === 'pet_type' && (
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
          {step === 'size' && (
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
          {step === 'energy' && (
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
          {step === 'housing' && (
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
          {step === 'good_with' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-1">
                Tap to require. Leave untapped if it doesn't matter.
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
        </div>

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
