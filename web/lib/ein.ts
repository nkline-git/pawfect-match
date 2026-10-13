// Nonprofit EIN lookup against IRS Exempt Organizations data, via ProPublica's
// free Nonprofit Explorer API (no key needed):
//   https://projects.propublica.org/nonprofits/api
//
// Only proves that the EIN belongs to a registered 501(c)(3) — not that the
// person entering it represents that organization. Admin review (the
// "Verified rescue" badge) is still the real identity check.

export type EinLookup =
  | { status: 'ok'; ein: string; name: string; city: string | null; state: string | null }
  | { status: 'not_found' }          // no IRS record for this EIN
  | { status: 'not_501c3'; name: string | null } // exists, but not a 501(c)(3)
  | { status: 'invalid' }            // not 9 digits
  | { status: 'unavailable' }        // lookup service unreachable — never treat as verified

export function normalizeEin(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length === 9 ? digits : null
}

export function formatEin(digits: string): string {
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

export async function lookupEin(raw: string, fetchImpl: typeof fetch = fetch): Promise<EinLookup> {
  const ein = normalizeEin(raw)
  if (!ein) return { status: 'invalid' }
  try {
    const res = await fetchImpl(`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`, {
      headers: { 'User-Agent': 'PawfectMatch/1.0 (pet-adoption-app)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 404) return { status: 'not_found' }
    if (!res.ok) return { status: 'unavailable' }
    const org = (await res.json())?.organization
    // ProPublica answers some never-registered EINs with an all-null shell
    // record — no subsection code means no IRS exemption on file
    if (!org || org.subsection_code == null) return { status: 'not_found' }
    if (Number(org.subsection_code) !== 3) return { status: 'not_501c3', name: org.name ?? null }
    return { status: 'ok', ein: formatEin(ein), name: String(org.name ?? ''), city: org.city ?? null, state: org.state ?? null }
  } catch {
    return { status: 'unavailable' }
  }
}

/** User-facing message for every non-ok lookup result. */
export function einErrorMessage(r: Exclude<EinLookup, { status: 'ok' }>): string {
  switch (r.status) {
    case 'invalid':     return 'Enter a valid 9-digit EIN (XX-XXXXXXX).'
    case 'not_found':   return "We couldn't find this EIN in IRS nonprofit records. Double-check it, or request a manual review instead."
    case 'not_501c3':   return `IRS records list ${r.name ?? 'this EIN'} as a nonprofit, but not a 501(c)(3). Request a manual review instead.`
    case 'unavailable': return "We couldn't reach IRS records right now. Please try again in a few minutes, or request a manual review."
  }
}
