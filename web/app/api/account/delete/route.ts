import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE() {
  // Verify the caller is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service-role client to delete the auth user (cascades to profile via DB trigger)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Delete user data first (in case RLS blocks cascade)
  await admin.from('saved_pets').delete().eq('user_id', user.id)
  await admin.from('applications').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete the auth user itself
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
