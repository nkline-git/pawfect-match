# 🚀 Pawfect Match — Launch Checklist

_Last updated: July 8, 2026_

## ⚠️ Do these two things first (5 minutes)

Open the **Supabase SQL editor** (https://supabase.com/dashboard/project/nqreysxsdpynzbbxmuva/sql) and run, in order:

1. **`supabase/migrations/005_admin_policies.sql`** — SECURITY FIX
   - Blocks users from promoting themselves to admin (currently possible!)
   - Makes the admin panel's Verify/Reject/Hide buttons actually work
2. **`supabase/migrations/004_store_products.sql`**
   - Unlocks store product shelves + announcement banners on store pages

## Deploy steps

1. Push to GitHub, import to Vercel (or your host)
2. Set environment variables in the host dashboard:
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

## The agency pitch flow (all verified working)

1. Agency visits `/rescue/verify` (linked from login page + community page)
2. Enters org name + EIN → verified
3. Signs up (email or Google) — their EIN survives the signup round-trip
4. Lands on `/rescue/setup` with everything pre-filled → customizes logo/banner/mission
5. Dashboard: adds pets (with photos), creates adoption events, reviews applications
6. Their animals appear **first** in every user's browse queue with a "Local rescue" badge
7. Their public page (`/rescues/[id]`) is their branded mini-site

## What's already done ✓

- 2,000 animals per fetch from RescueGroups (8 pages parallel, 12s timeouts, partial-result resilience)
- Photo galleries with prefetch, swipe UX, match celebrations, undo, seen-tracking
- "Why recommended" banner (matches user quiz preferences to each animal)
- Store mini-storefronts (pending 004): product shelf, deal banner, dashboard manager
- Rescue custom pages: branding, stats, events, pet grid
- Events: rescues create adoption days/fundraisers from their dashboard
- Auth suite: login, signup, Google OAuth, forgot/reset password, delete account (App Store requirement)
- Legal: Privacy Policy, Terms of Service, affiliate disclosure, 13+ policy
- Admin panel: rescue verification queue, content reports, moderation
- Error handling: network-failure banner with retry, graceful empty states
- Production build passes clean (28 routes)

## Nice-to-haves post-launch

- Real IRS/Candid EIN verification API (currently format-check + manual admin approval)
- Analytics + error tracking (e.g. Vercel Analytics, Sentry)
- Real store product photos (currently emoji + optional photo URL)
- Push notifications for new matching pets
