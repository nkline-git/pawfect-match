import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rescue Dashboard' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
