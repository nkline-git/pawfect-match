import { test, expect, type Page } from '@playwright/test'

// Regression sweep over every public page at phone, tablet, and desktop
// widths: no console errors, no failed same-origin requests, no broken
// images, no horizontal overflow, and the app chrome (header + bottom nav)
// fully on screen.

const PAGES = [
  '/', '/saved', '/shop', '/community', '/login', '/signup', '/forgot-password',
  '/rehome', '/sos', '/privacy', '/terms', '/rescue/verify', '/stores/register',
]

const VIEWPORTS = [
  { name: 'phone',   width: 375,  height: 667 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

// Errors that come from the dev server's hot-reload socket, not the app
const DEV_NOISE = /Router action dispatched before initialization|webpack-hmr|turbopack-hmr|Download the React DevTools/i

function watch(page: Page) {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error' && !DEV_NOISE.test(m.text())) errors.push(m.text()) })
  page.on('pageerror', e => errors.push(String(e)))
  page.on('requestfailed', r => {
    const url = r.url()
    // Third-party map tiles / geocoders can be flaky; only same-origin failures are app bugs.
    // Aborted fetches are intentional (superseded searches).
    if (url.startsWith('http://localhost:3000') && r.failure()?.errorText !== 'net::ERR_ABORTED') {
      errors.push(`request failed: ${url} ${r.failure()?.errorText}`)
    }
  })
  page.on('response', r => {
    if (r.url().startsWith('http://localhost:3000') && r.status() >= 500) errors.push(`HTTP ${r.status()}: ${r.url()}`)
  })
  return errors
}

// The first request to a page compiles it in dev, which can take a while
test.setTimeout(90_000)

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const path of PAGES) {
      test(`${path} renders cleanly`, async ({ page }) => {
        const errors = watch(page)
        await page.goto(path)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // No sideways scrolling
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1)

        // Bottom nav, when present, sits fully inside the viewport
        const nav = page.locator('nav').last()
        if (await nav.count()) {
          const box = await nav.boundingBox()
          if (box) {
            expect(box.y, 'nav top').toBeGreaterThanOrEqual(0)
            expect(box.y + box.height, 'nav bottom').toBeLessThanOrEqual(vp.height + 1)
          }
        }

        // Every image that finished loading actually decoded
        const broken = await page.evaluate(() =>
          [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map(i => i.src))
        expect(broken, 'broken images').toEqual([])

        expect(errors, 'console / network errors').toEqual([])
      })
    }
  })
}
