'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pet, PetSpecies } from '@/types'

interface UsePetsOptions {
  species?: PetSpecies
  status?: 'available' | 'pending' | 'adopted'
  rescueId?: string
}

export function usePets(options: UsePetsOptions = {}) {
  const [pets, setPets]       = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  // Stable client — createBrowserClient returns a new object each call,
  // so we pin it via lazy useState init to avoid infinite useCallback/useEffect re-runs.
  const [supabase] = useState(createClient)

  const fetchPets = useCallback(async () => {
    setLoading(true)
    const buildQuery = (withPublished: boolean) => {
      let query = supabase
        .from('pets')
        .select(`*, rescue:rescues(id, name, city, logo, lat, lon${withPublished ? ', published' : ''})`)
        .eq('status', options.status ?? 'available')
        .order('created_at', { ascending: false })
      if (options.species)  query = query.eq('species', options.species)
      if (options.rescueId) query = query.eq('rescue_id', options.rescueId)
      return query
    }

    // published column arrives with migration 011 — retry without it if absent
    let { data, error } = await buildQuery(true)
    if (error?.code === '42703') ({ data, error } = await buildQuery(false))
    if (error) setError(error.message)

    // Hide draft rescues' pets from the public feed. Rehoming pets (no
    // rescue) always pass; a rescue viewing its own dashboard (rescueId
    // option) always sees its pets.
    const rows = (data ?? []).filter(
      p => options.rescueId || p.rescue?.published !== false
    )
    setPets(rows)
    setLoading(false)
  }, [supabase, options.species, options.status, options.rescueId])

  useEffect(() => {
    (async () => { await fetchPets() })()
  }, [fetchPets])

  return { pets, loading, error, refetch: fetchPets }
}

export function useSavedPets() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [supabase] = useState(createClient)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('saved_pets').select('pet_id').eq('user_id', user.id)
      setSavedIds(new Set((data ?? []).map(r => r.pet_id)))
    }
    load()
  }, [supabase])

  const toggleSave = async (petId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (savedIds.has(petId)) {
      await supabase.from('saved_pets').delete().eq('user_id', user.id).eq('pet_id', petId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(petId); return next })
    } else {
      await supabase.from('saved_pets').insert({ user_id: user.id, pet_id: petId })
      setSavedIds(prev => new Set([...prev, petId]))
    }
  }

  return { savedIds, toggleSave }
}
