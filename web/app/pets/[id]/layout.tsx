import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: pet } = await supabase
    .from('pets')
    .select('name, breed, species')
    .eq('id', id)
    .single()

  if (!pet) return { title: 'Pet Details' }

  const subtitle = [pet.breed, pet.species].filter(Boolean).join(' · ')
  return {
    title: pet.name,
    description: subtitle
      ? `Meet ${pet.name} — a ${subtitle} available for adoption.`
      : `Meet ${pet.name}, available for adoption.`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
