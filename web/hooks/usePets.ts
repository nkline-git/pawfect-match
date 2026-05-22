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
  const supabase = createClient()

  const fetchPets = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('pets')
      .select('*, rescue:rescues(id, name, city, logo)')
      .eq('status', options.status ?? 'available')
      .order('created_at', { ascending: false })

    if (options.species)  query = query.eq('species', options.species)
    if (options.rescueId) query = query.eq('rescue_id', options.rescueId)

    const { data, error } = await query
    if (error) setError(error.message)
    setPets(data ?? [])
    setLoading(false)
  }, [supabase, options.species, options.status, options.rescueId])

  useEffect(() => { fetchPets() }, [fetchPets])

  return { pets, loading, error, refetch: fetchPets }
}

export function useSavedPets() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

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
