'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ShoppingBag, Users, Bookmark } from 'lucide-react'
import { RG_SAVED_KEY } from '@/types'

const NAV_ITEMS = [
  { label: 'Adopt',     icon: Home,        href: '/'          },
  { label: 'Shop',      icon: ShoppingBag, href: '/shop'      },
  { label: 'Community', icon: Users,       href: '/community' },
  { label: 'Saved',     icon: Bookmark,    href: '/saved'     },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const read = () => {
      try {
        const arr = JSON.parse(localStorage.getItem(RG_SAVED_KEY) ?? '[]')
        setSavedCount(Array.isArray(arr) ? arr.length : 0)
      } catch { /* noop */ }
    }
    read()
    window.addEventListener('storage', read)
    // Poll so the badge updates when the user likes a pet in this tab too
    const id = setInterval(read, 2000)
    return () => { window.removeEventListener('storage', read); clearInterval(id) }
  }, [])

  return (
    <nav className="mt-3 bg-white rounded-2xl shadow-sm">
      <div className="flex">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = href
            ? href === '/' ? pathname === '/' : pathname.startsWith(href)
            : false

          return (
            <button
              key={label}
              onClick={() => router.push(href)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors cursor-pointer relative"
              style={{ color: active ? 'var(--coral)' : '#9ca3af' }}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {label === 'Saved' && savedCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
