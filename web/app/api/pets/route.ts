import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/pets?species=dog&status=available&city=San+Diego&limit=20&offset=0
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species')
  const status  = searchParams.get('status') ?? 'available'
  const limit   = Number(searchParams.get('limit')  ?? 20)
  const offset  = Number(searchParams.get('offset') ?? 0)

  const supabase = await createClient()

  let query = supabase
    .from('pets')
    .select(`
      *,
      rescue:rescues (id, name, city, logo)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (species) query = query.eq('species', species)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/pets — rescue creates a new pet listing
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Make sure the user owns a rescue
  const { data: rescue } = await supabase
    .from('rescues')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rescue) return NextResponse.json({ error: 'No rescue profile found' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...body, rescue_id: rescue.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update rescue animal count
  await supabase.rpc('increment_rescue_stat', { rescue_id: rescue.id, stat: 'animals' })

  return NextResponse.json({ data }, { status: 201 })
}
