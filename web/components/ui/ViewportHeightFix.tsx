'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// `100dvh` is supposed to track the real, dynamic viewport (address bar
// show/hide, on-screen keyboard) — but it's known to get "stuck" at a stale
// value after a client-side route change in a lot of mobile browsers and,
// especially, in-app WebViews (which is what this app ships as once wrapped
// for the Play/App Store). Symptom: navigate to another tab and the bottom
// nav / header end up just off-screen, requiring a scroll to reach either.
//
// Fix: track the real viewport height ourselves via `visualViewport` (falls
// back to `window.innerHeight`) and publish it as a CSS var that every
// app-shell page's height is actually pinned to, recalculated on resize,
// orientation change, and every route change (not just on first mount).
function setAppVh() {
  const height = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-vh', `${height}px`)
}

export default function ViewportHeightFix() {
  const pathname = usePathname()

  // Global listeners for the actual trigger (the browser chrome resizing) —
  // registered once, since this component lives in the root layout and
  // never unmounts across client-side navigations.
  useEffect(() => {
    setAppVh()
    window.visualViewport?.addEventListener('resize', setAppVh)
    window.addEventListener('resize', setAppVh)
    window.addEventListener('orientationchange', setAppVh)
    window.addEventListener('pageshow', setAppVh)
    return () => {
      window.visualViewport?.removeEventListener('resize', setAppVh)
      window.removeEventListener('resize', setAppVh)
      window.removeEventListener('orientationchange', setAppVh)
      window.removeEventListener('pageshow', setAppVh)
    }
  }, [])

  // Belt-and-suspenders: also recheck right after every client-side route
  // change specifically, plus once more a moment later in case the address
  // bar is still mid-animation when the new page mounts.
  useEffect(() => {
    setAppVh()
    const settleTimer = setTimeout(setAppVh, 300)
    return () => clearTimeout(settleTimer)
  }, [pathname])

  return null
}
