# 🚀 Pawfect Match — Launch Checklist

_Last updated: October 12, 2026_

## 🔍 Production audit (Oct 12, 2026): real pets only

### Release blockers that need the owner's approval (not done automatically)

1. **Delete fabricated demo data.** Run `supabase/cleanup/remove_demo_data.sql`
   in the Supabase SQL editor. Removes the fake Heartland Paws Rescue (marked
   Verified, 555 phone, invented EIN) + its 4 pets (stock photos), the
   "Peanut" rehoming demo, the "Ziggy" lost-pet demo, the fake Dapper Dog store
   + 4 products, 2 fake events, the junk "123" rescue + 2 pets, and the 3 demo
   login accounts (their passwords were published in this public repo).
2. **Apply migration `015_protect_verification.sql`.** Until it's applied, any
   rescue or store owner can mark themselves Verified/Featured (or publish
   themselves) from the browser, and draft rescues' pets are readable through
   the API. After it: only an admin's Verify publishes a rescue, and draft
   pets are visible only to their own rescue.
3. **Fix the support email.** Privacy Policy and Terms list
   `support@pawfectmatch.app`, but that domain doesn't exist — every privacy
   or support request bounces. Choose a real address.
4. **Deploy** (push to master).

### What the audit found and fixed

- **RescueGroups feed** (`lib/rescuegroups.ts`, `app/api/rescuegroups/route.ts`)
  - Showed listings untouched since 2018–2019 as available → now only
    listings updated in the last 180 days; adoption-pending excluded.
  - Location search scanned an arbitrary 2,000 of ~55,000 animals nationwide
    → now a real lat/lon box at RescueGroups + exact distance. (Their
    `filterRadius` really is broken; the old request body was also missing
    the required `data` wrapper.)
  - Tags like "Good with kids" / "Vaccinated" / "Fixed" were guessed from
    description keywords ("NOT good with kids" → "Good with kids") because
    the structured field names in the code didn't exist → now only the
    source's own fields (isKidsOk, isDogsOk, isCatsOk, isHousetrained, …).
  - Adoption links fell back to a rescuegroups.org URL that 404s → now only
    the animal's listing, the rescue's adoption page, or its website.
    Rescue websites were never shown at all (wrong field names) → fixed.
  - The Filters panel (size, energy, breed, good-with) only applied to local
    pets, never RescueGroups pets → applied to both.
  - Detail sheet shows source + last-updated date; Saved re-checks live
    status and labels adopted/removed pets.
- **Zip-code search never worked anywhere** (Nominatim 400s when `q` is mixed
  with `postalcode`) → fixed in `lib/geocode.ts`; feed + Shop use it.
- **Rescue "EIN verification" was simulated** (accepted any 9 digits) → now a
  real IRS 501(c)(3) lookup via ProPublica (`lib/ein.ts`).
- **Rescues build privately; only you publish.** Every rescue starts as a
  draft: full profile + pets (incl. spreadsheet import), with private
  previews of its page and listings. "Submit for review" (EIN optional,
  IRS-checked) emails you the IRS record and pet count; only /admin → Verify
  publishes. Previously an EIN at sign-up published instantly, unreviewed,
  and a draft's pets could be opened by direct link.
- **Shop** had invented prices, discounts, star ratings, review counts,
  "Vet recommended" badges, stock dog photos as product images, and a fake
  "PAWFECT20" coupon → all removed; cards link to Chewy for real prices.
- **Pet profile**: "Application sent!" showed even when the insert failed;
  Apply showed on adopted pets and on owner-rehoming pets (where it always
  fails) → fixed. Rescue website links without https:// were broken → fixed.
- **Community** listed past events as upcoming → upcoming only; event page
  says "This event has ended".
- **Security**: Next.js 16.3.2 → 16.3.8 (critical advisories incl. RCE in
  `next/og` and image optimization, both used here). Production deps: 0
  vulnerabilities. (5 "high" remain in a dev-only ESLint dependency, `braces`,
  with no non-breaking fix upstream — never shipped to users.)
- **Tests**: 142 unit/component (new: rescuegroups, ein, geocode zip, radius),
  40 Playwright (golden path + every public page at 375/768/1280 px checking
  console errors, failed requests, broken images, overflow, nav position).

### Known, not changed (design decisions for the owner)

- Secondary text is light gray on white or white on the taupe background in
  many places — below WCAG AA contrast. Changing it app-wide would visibly
  alter the design, so only the worst case (gray on taupe) was fixed.
- The EIN check proves the EIN is a real 501(c)(3), not that the account
  represents it — that's what your review before clicking Verify is for
  (e.g. call the number on the organization's own public website).

## ✅ Cleanup pass: CI, image optimization, component tests, edit-pet, security

Five previously-optional items, now done:

- **CI wired up** (`.github/workflows/ci.yml`) — lint/typecheck/unit-tests/build
  now run automatically on every push/PR, not just when someone remembers to
  run them locally. A separate `workflow_dispatch`-only job runs the E2E test
  on demand (it hits the real Supabase/RescueGroups backend — no test/staging
  env exists — so it's opt-in, not automatic; needs `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESCUEGROUPS_API_KEY` added as repo secrets
  before it'll run).
- **All 20 `<img>` → `next/image` lint warnings fixed**, with real care about
  where each photo comes from: full optimization for first-party (Supabase
  Storage) and fixed-domain (Unsplash, OSM static maps) sources;
  `unoptimized` mode for RescueGroups pet photos and admin-pasted URLs
  (sponsored ads, store products) where there's no single guaranteed CDN
  host to allowlist safely; left as plain `<img>` (correctly — next/image
  can't render these) for `blob:` URL file-upload previews.
- **First component test coverage** — `FiltersSheet` (15 tests) and
  `AnimalDetailSheet` (25 tests, including the `shortBreed`/`formatAge` pure
  functions). Along the way, fixed a real gap: React Testing Library's
  auto-cleanup between tests wasn't wired up under Vitest, so every
  component test after the first in a file would've silently rendered on
  top of the previous test's leftover DOM.
- **Edit-pet UI** — rescues can now edit an existing listing in place
  (reuses the add-pet form, pre-filled; existing photos shown alongside new
  uploads, independently removable). Previously the only options were add,
  duplicate, and mark-adopted.
- **Next.js 16.2.6 → 16.3.2** (patch release) — fixes the postcss/sharp
  vulnerabilities bundled inside Next itself, plus 3 more unrelated
  dev-tooling ones via `npm audit fix`. **0 vulnerabilities now, was 6.**
  The upgrade also deprecated `runtime = 'edge'`, which three image-generation
  routes were using — removed per Next's own migration guidance (just delete
  the export, `nodejs` is the default); two of those routes now prerender as
  static instead of dynamic as a side effect.

All five committed as separate commits, verified with the full check-loop
(lint/typecheck/unit-tests/build/E2E) after each, plus live-browser
confirmation for the two highest-risk ones (image conversion, Next.js
upgrade). The edit-pet UI is the one exception — reviewed carefully by hand
instead, since exercising it live needs a rescue-account login.

## ✨ Added: breed autocomplete + fixed the location/radius "glitch"

**Breed autocomplete.** The Filters panel's breed field went from a 24-breed
quick-pick list with free-text entry to a live suggestion dropdown backed by
a ~240-breed list (`lib/petOptions.ts` — full AKC dog roster + CFA/TICA cat
breeds), ranked so prefix matches ("Corgi" typing "cor") beat mid-string
matches. Catches typos and half-remembered names as you type instead of only
after you've already spelled the whole thing right.

**Location + radius, fixed to auto-update.** The city field was a bare text
input with no validation — a typo or an ambiguous town name (there are a
dozen Springfields) would silently break the distance search, which is the
"glitch." Swapped in the same validated-suggestions `CityAutocomplete`
already used on `/profile`, and picking a suggestion now applies immediately
— no separate submit step. Distance moved into the same panel as a slider
that also applies live (debounced so dragging doesn't fire a request per
pixel) instead of only being adjustable from the separate Filters panel or
`/profile`. Free-typing + Enter (for zips, which the city-only suggestion
API doesn't always surface) still works as a fallback.

## 🐛 Fixed: layout breaking after client-side navigation

Reported symptom: the header/bottom nav would end up off-screen after
navigating between pages, requiring a scroll to reach either. Root cause,
confirmed by reproducing it: `app/page.tsx` initialized several pieces of
state (guest city, guest filters, the match-popup opt-out, the first-visit
swipe hint) by reading `localStorage` **synchronously inside `useState`'s
initializer**, guarded by `typeof window !== 'undefined'`. That guard doesn't
do what it looks like it does — `window` exists on the client during
hydration too, so the client's first render already reflects the stored
value while the server's never could, and React detects the mismatch as a
hydration error. When that happens React throws away and regenerates the
affected part of the tree client-side, which is exactly the kind of visible
layout hiccup that was reported. Fixed by defaulting all of that state to
its SSR-safe empty value and loading the real value in a `useEffect` instead
(runs client-only, after hydration, so there's nothing to mismatch).

Also hardened `h-dvh` (used by every app-shell page's outer container)
against the separate, better-known mobile issue where `100dvh` can get stuck
at a stale value after an SPA route change, especially inside WebViews —
relevant since this app is meant to ship wrapped as a Play Store TWA / iOS
PWA per `STORE_RELEASE.md`. Added `ViewportHeightFix` (in the root layout),
which tracks the real viewport via `visualViewport` and republishes it as a
CSS var (`--app-vh`) that every app-shell page now sizes to instead of `dvh`
directly, recalculated on resize, orientation change, and every route change.

## ✨ Added: quick Filters panel on the browse page

Editing search filters used to mean leaving the browse page for the
`/onboarding` wizard (species/size/energy/housing/good-with, one step at a
time) and, separately, `/profile` for search radius. Now a "Filters" button
in the browse page's header opens one panel — radius, size, energy, housing,
good-with, and breeds, all in one scroll, saved with a single tap and no
page navigation. Works for guests too (persisted to localStorage) as well as
logged-in users (persisted to their profile, same fields `/onboarding` and
`/profile` already read/write, so nothing gets out of sync). The full guided
wizard at `/onboarding` is untouched — still the better first-time experience.

## ✅ Code quality gates — all clean

- `npm run lint` — **0 errors** (was 59; fixed React-hooks-rules violations from
  the Next 16 / eslint-plugin-react-hooks upgrade, unescaped entities, `<a>` → `<Link>`,
  `any` types, hoisting issues). 20 harmless `<img>`-vs-`next/image` perf warnings remain.
- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **passes clean, 32 routes** (was 28 — the app has grown since
  this doc was last accurate)
- `npm test` — **67 unit tests pass** (was 31 — 29 for the bulk-import parser,
  7 for the new breed-matching logic)
- `npm run test:e2e` — **1/1 E2E smoke test passes**, confirmed still passing after
  the navigation/hydration fix above
- Manually verified live in a browser: city autocomplete + auto-apply,
  radius slider auto-commit, breed autocomplete — no console errors
- Review the diff and commit before deploying: `git status` / `git diff`

## ✅ Automated tests — now exist (previously zero)

There was no test runner installed at all before this pass. Added:

- **Vitest** (`npm test` / `npm run test:watch`) — 31 unit tests covering the
  pure logic that's easiest to silently break and hardest to notice broken:
  - [`lib/matching.ts`](lib/matching.ts) (newly extracted from `app/page.tsx`,
    where this logic used to live un-exported and un-testable) — preference
    filtering (species/breed/size/energy/good-with), the haversine distance
    calc, and local-pet → unified-card mapping (rehoming vs. rescue pets,
    tag merging, photo fallbacks)
  - `lib/usStates.ts` — city/state string parsing used by location search
  - `lib/geocode.ts` — Nominatim response parsing and error handling (mocked `fetch`)
- **Playwright** (`npm run test:e2e`) — one E2E smoke test
  ([`e2e/golden-path.spec.ts`](e2e/golden-path.spec.ts)) that drives a real
  browser through the exact flow the app exists for: load the feed → like a
  pet → match modal appears → follow through to a working contact-the-rescue
  CTA (apply / email / site / phone, whichever the matched pet has). Verified
  non-flaky across repeated runs.
  - Added `aria-label`s to the four previously-unlabeled swipe-card icon
    buttons (pass/undo/details/like) — needed for the E2E test to find them
    reliably, and a real accessibility gap for screen-reader users regardless.

**Still not covered** — component tests (React Testing Library is installed
alongside Vitest but nothing uses it yet — e.g. the match modal, swipe
mechanics, or quiz-scoring UI in isolation) and E2E coverage beyond the one
golden path (auth, applying to adopt for real, rescue/store dashboards). This
is a reasonable floor for a first release, not a ceiling — worth building out
as the app gets real traffic, particularly before making risky changes to
`app/page.tsx` or the auth flows.

## ✅ Database migrations — verified applied

Checked all of `supabase/migrations/001`–`014` directly against the live DB
(schema-probed via the service-role key, not just assumed). **Everything through
014 is already applied** — 004 (store products) and 005 (admin security fix),
which this doc used to say still needed manual action, are both live.

One caveat: **010_post_likes_trigger.sql** creates a DB trigger + an RLS policy
tweak, neither of which is introspectable through the Supabase REST API, so it
couldn't be checked as directly as the others (only the underlying `post_likes`
table and `community_posts.likes` column were confirmed present). Every
statement in that migration is idempotent (`CREATE OR REPLACE`, `DROP ... IF
EXISTS`), so re-pasting it into the SQL editor is a zero-risk way to be 100%
sure if you want that guarantee.

## ✅ Manual QA — golden path verified

Walked the core flow in a live browser against your real Supabase project:
browse → swipe (Peanut, an owner-rehoming pet) → instant match → pet detail
page → "Apply to adopt" modal. Zero console errors at every step. Also spot-
checked `/community` and `/shop` — both render cleanly with no errors.

**Not tested:** anything requiring sign-in (admin panel, rescue/store
dashboards). Logging in — even with the demo credentials documented below —
means typing a password into a form, which isn't something I'll automate.
You'll need to click through those yourself:
- `/admin` (your account, nick.kline0@gmail.com)
- `/rescue/dashboard` (demo-rescue@pawfectmatch.app)
- `/stores/dashboard` (demo-store@pawfectmatch.app)

## Deploy steps

1. Commit the pending lint/build fixes, push to GitHub → Vercel picks it up
   (already connected — the site is live at pawfect-match-khaki.vercel.app)
2. Confirm environment variables are set in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` (same as .env.local)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by account deletion)
   - `RESCUEGROUPS_API_KEY`
   - `NEXT_PUBLIC_APP_URL` → **your production domain** (powers social-share images)
3. In Supabase → Authentication → URL Configuration:
   - Set Site URL to your production domain
   - Add `https://yourdomain.com/api/auth/callback` to redirect URLs
4. If using Google login: update the OAuth redirect in Google Cloud Console

## Demo accounts — MUST be deleted before launch

Three demo accounts (demo-adopter@, demo-rescue@, demo-store@pawfectmatch.app)
own the fabricated Heartland Paws Rescue, its pets, the Dapper Dog store, the
Peanut rehoming listing, and the Ziggy lost-pet alert. Their passwords were
previously listed here, and this repository is public, so treat them as
compromised: delete the accounts and their data (see
`supabase/cleanup/remove_demo_data.sql`) rather than just changing passwords.

Your account (nick.kline0@gmail.com) is **admin** — visit `/admin` to verify rescues and moderate reports.

## The agency pitch flow (all verified working as of last check)

1. Agency visits `/rescue/verify` (linked from login page + community page)
2. Enters org name + EIN → verified
3. Signs up (email or Google) — their EIN survives the signup round-trip
4. Lands on `/rescue/setup` with everything pre-filled → customizes logo/banner/mission
5. Dashboard: adds pets fast — multi-photo upload, "Add & add another" carries
   over species/breed/size/fee/traits for the next listing, "Duplicate" clones
   an existing listing for littermates, and **"Import from spreadsheet"** takes
   a CSV export of their existing animal list (Excel/Sheets/Numbers all export
   CSV directly) and adds every row at once — plus creates adoption events, reviews applications
6. Their animals appear **first** in every user's browse queue with a "Local rescue" badge
7. Their public page (`/rescues/[id]`) is their branded mini-site

## What's already done ✓

- 2,000 animals per fetch from RescueGroups (8 pages parallel, 12s timeouts, partial-result resilience)
- Photo galleries with prefetch, swipe UX, match celebrations, undo, seen-tracking
- "Why recommended" banner (matches user quiz preferences to each animal)
- Store mini-storefronts: product shelf, deal banner, dashboard manager, buy-links + click tracking
- Rescue custom pages: branding, stats, events, pet grid
- Events: rescues and stores create adoption days/fundraisers/sales from their dashboards
- Owner rehoming + Lost Pet SOS (community-search alerts)
- Sponsored house ads (admin-curated)
- Auth suite: login, signup, Google OAuth, forgot/reset password, delete account (App Store requirement)
- Legal: Privacy Policy, Terms of Service, affiliate disclosure, 13+ policy
- Admin panel: rescue verification queue, content reports, moderation, featured stores
- Error handling: network-failure banner with retry, graceful empty states
- Quick Filters panel on the browse page (radius/size/energy/housing/good-with/breeds,
  no navigation, works for guests and logged-in users), with breed autocomplete
  (~240 breeds) and validated-suggestion city search + a live-updating radius slider
- Lint, typecheck, production build, unit tests, E2E smoke test, and `npm audit`
  (0 vulnerabilities) all pass clean (35 routes)
- CI runs lint/typecheck/tests/build automatically on every push (`.github/workflows/ci.yml`)

## Nice-to-haves post-launch

- Minor duplication: `SIZE_OPTIONS`/`ENERGY_OPTIONS`/etc. now live in
  `lib/petOptions.ts` for the new Filters panel, but `/onboarding` and the
  breed-picker on `/profile` still have their own local copies of the same
  lists. Low-risk cleanup to point them at the shared file, not urgent.
- Broader test coverage: only 2 components have tests so far (FiltersSheet,
  AnimalDetailSheet); more E2E paths beyond the one golden path (real
  signup+adopt, the rescue/store dashboards, the new edit-pet flow)
- Delete-pet support — editing and marking-adopted exist now, but there's
  still no way to remove a listing outright
- Real IRS/Candid EIN verification API (currently format-check + manual admin approval)
- Analytics + error tracking (e.g. Vercel Analytics, Sentry)
- Real store product photos (currently emoji + optional photo URL)
- Push notifications for new matching pets
