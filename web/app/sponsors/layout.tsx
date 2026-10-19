import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Become a sponsor',
  description: 'Reach new pet families in your area the day they adopt. Sponsorships for vets, groomers, trainers, and pet brands.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
