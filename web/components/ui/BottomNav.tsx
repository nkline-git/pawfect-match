'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, ShoppingBag, Users, Bookmark } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Adopt',     icon: Home,        href: '/'          },
  { label: 'Shop',      icon: ShoppingBag, href: '/shop'      },
  { label: 'Community', icon: Users,       href: '/community' },
  { label: 'Saved',     icon: Bookmark,    href: '/saved'     },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()

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
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors cursor-pointer"
              style={{ color: active ? 'var(--coral)' : '#9ca3af' }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
