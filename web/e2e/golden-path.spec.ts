import { test, expect } from '@playwright/test'

// Smoke test for the core adoption loop: browse -> swipe/like -> match ->
// contact the shelter. This is the single flow the whole app exists to
// support, so it's the one thing that must never silently break.
test('browse, like a pet, get matched, and see a way to contact the rescue', async ({ page }) => {
  await page.goto('/')

  // The swipe card and its action buttons live inside the main feed —
  // wait for a pet name heading to confirm animals actually loaded
  // (RescueGroups / Supabase fetch resolved) before interacting.
  const likeButton = page.getByRole('button', { name: 'Like this pet' })
  await expect(likeButton).toBeVisible({ timeout: 20_000 })

  await likeButton.click()

  // Every like triggers the match celebration (unless the user has
  // permanently dismissed it — a fresh browser context never has).
  await expect(page.getByText("It's a match!")).toBeVisible({ timeout: 10_000 })

  // The modal always offers at least one way to move toward adoption:
  // for locally-listed pets, a link to the pet's profile + apply flow;
  // for RescueGroups pets, the org's site, email, phone, or a "contact
  // them directly" fallback. Assert whichever the current pet resolved to.
  const modal = page.locator('.fixed.inset-0.z-\\[60\\]')
  const viewProfileLink = modal.getByRole('link', { name: /profile & apply/i })
  const contactCta = modal.getByRole('link', { name: /website|email|^\+?[\d ()-]+$/i })
  const contactFallbackText = modal.getByText(/Contact them to start/i)

  if (await viewProfileLink.count() > 0) {
    await viewProfileLink.click()
    await expect(page).toHaveURL(/\/pets\//)
    // The pet detail page's own CTA to actually reach the rescue
    await expect(
      page.getByRole('button', { name: /apply to adopt/i })
        .or(page.getByRole('link', { name: /email the owner/i }))
        .first()
    ).toBeVisible({ timeout: 10_000 })
  } else {
    await expect(contactCta.first().or(contactFallbackText)).toBeVisible()
  }
})
