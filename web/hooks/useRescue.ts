'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Rescue } from '@/types'

export function useRescue() {
  const [rescue, setRescue]   = useState<Rescue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchRescue = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('rescues')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') setError(error.message)
    setRescue(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRescue() }, [fetchRescue])

  const updateRescue = async (updates: Partial<Rescue>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('rescues')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!error) setRescue(data)
    return { data, error: error?.message ?? null }
  }

  const createRescue = async (rescueData: Omit<Rescue, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('rescues')
      .insert({ ...rescueData, user_id: user.id })
      .select()
      .single()

    if (!error) setRescue(data)
    return { data, error: error?.message ?? null }
  }

  return { rescue, loading, error, updateRescue, createRescue, refetch: fetchRescue }
}
