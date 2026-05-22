import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/rescue/verify
// Verifies a nonprofit EIN against our records (and eventually a real IRS/Candid API)
export async function POST(request: Request) {
  try {
    const { ein, orgName } = await request.json()

    if (!ein || !orgName) {
      return NextResponse.json({ error: 'EIN and organization name are required' }, { status: 400 })
    }

    // Validate EIN format: XX-XXXXXXX (9 digits)
    const digits = ein.replace(/\D/g, '')
    if (digits.length !== 9) {
      return NextResponse.json({ error: 'Invalid EIN format. Must be 9 digits (XX-XXXXXXX).' }, { status: 400 })
    }

    // Check if this EIN is already registered to another account
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('rescues')
      .select('id, name')
      .eq('ein', ein)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `This EIN is already registered to "${existing.name}". Contact support if this is an error.` },
        { status: 409 },
      )
    }

    // TODO: Replace this simulation with a real IRS/Candid API call
    // e.g. https://api.candid.org/v3/essentials/{ein}
    // For now, accept any valid-format EIN
    await new Promise(r => setTimeout(r, 800)) // simulate network latency

    return NextResponse.json({
      verified: true,
      ein,
      orgName,
      message: 'Organization verified successfully',
    })
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
