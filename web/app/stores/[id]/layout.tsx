import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('pet_stores')
    .select('name, city')
    .eq('id', id)
    .single()

  if (!store) return { title: 'Pet Store' }

  return {
    title: store.name,
    description: `${store.name} — a local pet shop in ${store.city}.`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
