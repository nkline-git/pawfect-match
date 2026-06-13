'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to an error tracking service in production
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[390px] text-center">
        <span className="text-7xl block mb-4">😿</span>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/70 text-sm mb-8">
          We hit an unexpected error. It&apos;s not you — it&apos;s us.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 rounded-2xl text-white font-semibold shadow-lg"
            style={{ backgroundColor: '#e05a4e' }}
          >
            Try again
          </button>
          <a
            href="/"
            className="w-full py-3 rounded-2xl font-semibold border border-white/30 text-white/80 hover:text-white text-center"
          >
            Back to browse
          </a>
        </div>
      </div>
    </div>
  )
}
