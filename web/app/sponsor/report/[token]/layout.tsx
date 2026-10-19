import type { Metadata } from 'next'

// Private link — keep it out of search engines
export const metadata: Metadata = {
  title: 'Sponsor report',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
