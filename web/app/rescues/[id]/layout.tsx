import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: rescue } = await supabase
    .from('rescues')
    .select('name, city')
    .eq('id', id)
    .single()

  if (!rescue) return { title: 'Rescue Details' }

  return {
    title: rescue.name,
    description: `${rescue.name} — a rescue organization in ${rescue.city}.`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
