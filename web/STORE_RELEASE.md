# 📱 Pawfect Match — Play Store & App Store Release Guide

The app is a PWA-ready Next.js site. Both stores accept it via wrappers:
- **Google Play** → TWA (Trusted Web Activity) — packaged straight from the deployed site, ~1 hour
- **Apple App Store** → PWABuilder iOS package or Capacitor — needs a Mac (or cloud build) for the final step

Everything the stores require in-app is already done: privacy policy (`/privacy`),
terms (`/terms`), in-app account deletion (profile page), 13+ policy, content
moderation + report flows, affiliate disclosure.

---

## Google Play Store (do this one first — easiest)

**Prereqs:** Google Play Console account ($25 one-time) · the site deployed on
your production domain · Node.js + JDK 17 (Bubblewrap installs its own if missing)

1. **Package the app with Bubblewrap:**
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://pawfect-match-khaki.vercel.app/manifest.json
   #   applicationId: app.pawfectmatch.twa   (or your own reverse-domain id)
   #   answer prompts; it generates an Android project + signing keystore
   bubblewrap build
   ```
   Output: `app-release-signed.aab` (upload this) + `assetlinks.json` content.
   **Back up the generated `android.keystore` file — losing it means you can
   never update the app.**

2. **Prove site ownership (removes the browser URL bar):**
   Bubblewrap prints a SHA-256 fingerprint. Put it into
   `web/public/.well-known/assetlinks.json` (file already scaffolded — replace
   `REPLACE_WITH_SHA256_FINGERPRINT`), commit, push, redeploy.
   Verify at: `https://<your-domain>/.well-known/assetlinks.json`

3. **Play Console → Create app:**
   - Upload the `.aab` under Production (or Internal testing first — recommended)
   - Store listing: name, short + full description, screenshots (phone: take
     from the deployed site at 390×844, at least 2), 512×512 icon
     (`https://<domain>/api/pwa-icon?size=512`), feature graphic 1024×500
   - Privacy policy URL: `https://<your-domain>/privacy`
   - Data safety form: collects email (account), approximate location (user-provided
     city, optional), user content (posts/photos). No ads SDK, no tracking.
   - Content rating questionnaire: social features → answer honestly (user-generated
     content with moderation + report tools)
   - App access: provide the demo adopter credentials for review

4. Review typically takes 1–7 days for a new account.

---

## Apple App Store

Apple requires the binary to be built with Xcode (Mac). Two practical paths from Windows:

**Path A — PWABuilder (recommended, no code):**
1. Go to https://www.pwabuilder.com, enter your production URL
2. Fix anything it flags (it will pass — manifest + icons are compliant)
3. Download the **iOS package** — it generates an Xcode project
4. Build/submit via: a friend's Mac, a cloud Mac (MacinCloud ~$1/hr), or a CI
   service (Codemagic free tier builds + uploads to App Store Connect)

**Path B — Capacitor (native wrapper, more control later):**
Only worth it when you want push notifications or native APIs. Ask me and I'll
scaffold it (`@capacitor/core` + `ios` platform pointing at the deployed URL).

**Either path needs:**
- Apple Developer Program ($99/year) — enroll at developer.apple.com
- App Store Connect listing: screenshots (6.7" + 6.5" iPhone sizes), description,
  privacy nutrition labels (same data as Play's form), demo login for review
- **Review watch-outs Apple actually enforces:**
  - Account deletion in-app ✓ (already built)
  - UGC moderation + report + block ✓ (report flows exist; if they ask for
    user *blocking*, tell me and I'll add it same-day)
  - The app must feel app-like, not a website in a shell ✓ (standalone display,
    no browser chrome, bottom nav)

---

## Before either store: production domain

Both stores want a stable domain (the `.vercel.app` domain works for Play,
but a custom domain looks better and Apple reviewers are pickier):
1. Buy a domain (e.g. pawfectmatch.app) → add in Vercel → Domains
2. Update `NEXT_PUBLIC_APP_URL` env var + Supabase auth Site URL/redirects
3. Re-run Bubblewrap with the new domain if you already packaged

## Store listing copy (ready to paste)

**Short description (80 chars):**
> Swipe to match with rescue pets near you. Adopt, don't shop! 🐾

**Full description:**
> Pawfect Match makes finding your new best friend feel like magic. Swipe
> through thousands of real adoptable dogs, cats, rabbits, and birds from
> shelters and rescues near you — with photos, personalities, and everything
> you need to know.
>
> 🐾 2,000+ adoptable pets from rescues nationwide
> ❤️ Swipe right to save, get matched, and contact the rescue directly
> ✨ Personalized recommendations based on your lifestyle
> 🏠 Browse each rescue's page — all their animals, events, and adoption info
> 💛 Rehome a pet responsibly when life changes
> 🚨 Lost Pet SOS — rally your community to bring pets home
> 🛍️ Support local pet stores and find new-adopter deals
>
> Every swipe supports real shelters. Adopt, don't shop.
