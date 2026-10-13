import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { lookupEin, einErrorMessage } from '@/lib/ein'

// POST /api/rescue/verify
// Checks a nonprofit EIN against IRS Exempt Organizations records (via
// ProPublica) before a rescue can build a published page with it.
export async function POST(request: Request) {
  try {
    const { ein, orgName } = await request.json()

    if (!ein || !orgName) {
      return NextResponse.json({ error: 'EIN and organization name are required' }, { status: 400 })
    }

    const result = await lookupEin(String(ein))
    if (result.status !== 'ok') {
      return NextResponse.json(
        { error: einErrorMessage(result), reason: result.status },
        { status: result.status === 'unavailable' ? 503 : 400 },
      )
    }

    // Check if this EIN is already registered to another account
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('rescues')
      .select('id, name')
      .eq('ein', result.ein)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `This EIN is already registered to "${existing.name}". Contact support if this is an error.` },
        { status: 409 },
      )
    }

    return NextResponse.json({
      verified: true,
      ein: result.ein,
      orgName,
      irsName: result.name,
      irsLocation: [result.city, result.state].filter(Boolean).join(', ') || null,
      message: `Found ${result.name} in IRS nonprofit records`,
    })
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
