# 🚀 Pawfect Match — Launch Checklist

_Last updated: August 17, 2026_

## ✅ Code quality gates — all clean

- `npm run lint` — **0 errors** (was 59; fixed React-hooks-rules violations from
  the Next 16 / eslint-plugin-react-hooks upgrade, unescaped entities, `<a>` → `<Link>`,
  `any` types, hoisting issues). 20 harmless `<img>`-vs-`next/image` perf warnings remain.
- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **passes clean, 32 routes** (was 28 — the app has grown since
  this doc was last accurate)
- `npm test` — **31 unit tests pass** (see below)
- `npm run test:e2e` — **1/1 E2E smoke test passes** (see below)
- **All of the above is uncommitted** — 29 files modified, 7 new (`lib/matching.ts`
  + 3 test files, `vitest.config.mts`, `playwright.config.ts`, `e2e/`). Review
  the diff and commit before deploying: `git status` / `git diff`

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

## Demo accounts (delete before real launch, or keep for demos)

| Role | Email | Password |
|------|-------|----------|
| Adopter (has quiz preferences) | demo-adopter@pawfectmatch.app | DemoAdopter2026! |
| Rescue org (Heartland Paws) | demo-rescue@pawfectmatch.app | DemoRescue2026! |
| Store owner (Dapper Dog) | demo-store@pawfectmatch.app | DemoStore2026! |

Your account (nick.kline0@gmail.com) is **admin** — visit `/admin` to verify rescues and moderate reports.

## The agency pitch flow (all verified working as of last check)

1. Agency visits `/rescue/verify` (linked from login page + community page)
2. Enters org name + EIN → verified
3. Signs up (email or Google) — their EIN survives the signup round-trip
4. Lands on `/rescue/setup` with everything pre-filled → customizes logo/banner/mission
5. Dashboard: adds pets fast — multi-photo upload, "Add & add another" carries
   over species/breed/size/fee/traits for the next listing, "Duplicate" clones
   an existing listing for littermates — plus creates adoption events, reviews applications
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
- Lint, typecheck, production build, unit tests, and one E2E smoke test all pass clean (32 routes)

## Nice-to-haves post-launch

- Broader test coverage: component tests for the match modal/swipe mechanics,
  more E2E paths (real signup+adopt, dashboards) — see gate above for what exists today
- Wire the new `npm test` / `npm run test:e2e` into CI (e.g. a GitHub Actions
  workflow) so they run on every push, not just manually
- Real IRS/Candid EIN verification API (currently format-check + manual admin approval)
- Analytics + error tracking (e.g. Vercel Analytics, Sentry)
- Real store product photos (currently emoji + optional photo URL)
- Push notifications for new matching pets
- `<img>` → `next/image` conversion (20 lint warnings flag this; perf-only, not blocking)
