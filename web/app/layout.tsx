import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// ── Viewport (theme-color lives here in Next.js 15+) ──────────────
export const viewport: Viewport = {
  themeColor:     '#e05a4e',
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,   // prevent user-scaling — mobile app feel
  userScalable:   false,
}

// ── Rich metadata ──────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default:  'Pawfect Match — Find Your Perfect Rescue Pet',
    template: '%s | Pawfect Match',
  },
  description:
    'Swipe to match with rescue animals near you. Connect with local shelters and find your perfect pet — dogs, cats, rabbits, and more.',
  keywords: [
    'pet adoption', 'rescue animals', 'adopt a dog', 'adopt a cat',
    'animal shelter', 'pet finder', 'rescue pets nearby',
  ],
  applicationName: 'Pawfect Match',

  // ── Icons (apple-icon.tsx auto-serves the 180×180 apple touch icon)
  icons: {
    icon:     [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },

  // ── PWA manifest ──────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Apple PWA ─────────────────────────────────────────────────────
  appleWebApp: {
    capable:         true,
    title:           'Pawfect Match',
    statusBarStyle:  'default',
  },

  // ── Open Graph ────────────────────────────────────────────────────
  openGraph: {
    type:        'website',
    siteName:    'Pawfect Match',
    title:       'Pawfect Match — Find Your Perfect Rescue Pet',
    description: 'Swipe to match with rescue animals near you. Connect with local shelters.',
    locale:      'en_US',
  },

  // ── Twitter / X card (summary_large_image since opengraph-image.tsx exists)
  twitter: {
    card:        'summary_large_image',
    title:       'Pawfect Match',
    description: 'Swipe to find your perfect rescue pet 🐾',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans min-h-full`}>
        {children}
      </body>
    </html>
  )
}
