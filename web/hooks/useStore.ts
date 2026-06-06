'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PetStore } from '@/types'

export function useStore() {
  const [store, setStore]     = useState<PetStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchStore = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('pet_stores')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') setError(error.message)
    setStore(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchStore() }, [fetchStore])

  const updateStore = async (updates: Partial<PetStore>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('pet_stores')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (!error) setStore(data)
    return { data, error: error?.message ?? null }
  }

  const createStore = async (storeData: Omit<PetStore, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('pet_stores')
      .insert({ ...storeData, user_id: user.id })
      .select()
      .single()

    if (!error) setStore(data)
    return { data, error: error?.message ?? null }
  }

  return { store, loading, error, updateStore, createStore, refetch: fetchStore }
}
