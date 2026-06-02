import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[390px] text-center">
        <span className="text-7xl block mb-4">🐾</span>
        <h1 className="text-3xl font-bold text-white mb-2">404</h1>
        <p className="text-white/80 font-semibold mb-1">Page not found</p>
        <p className="text-white/60 text-sm mb-8">
          This page wandered off. Let&apos;s get you back home.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-2xl text-white font-semibold text-sm shadow-lg"
          style={{ backgroundColor: '#e05a4e' }}
        >
          Browse pets
        </Link>
      </div>
    </div>
  )
}
