'use client'

import { useState } from 'react'
import { Star, ExternalLink } from 'lucide-react'
import BottomNav from '@/components/ui/BottomNav'
import Link from 'next/link'

const CATEGORIES = [
  { label: 'All',       value: 'all',      icon: '🛍' },
  { label: 'Food',      value: 'food',     icon: '🥩' },
  { label: 'Toys',      value: 'toys',     icon: '🎾' },
  { label: 'Beds',      value: 'beds',     icon: '🛏' },
  { label: 'Grooming',  value: 'grooming', icon: '✂️' },
  { label: 'Health',    value: 'health',   icon: '💊' },
  { label: 'Travel',    value: 'travel',   icon: '🚗' },
]

type Product = {
  id: string
  category: string
  name: string
  sub: string
  price: number        // cents
  compare: number | null
  emoji: string
  brand: string
  rating: number
  reviews: number
  badge: string | null
  url: string
}

const PRODUCTS: Product[] = [
  // Food
  { id: '1',  category: 'food',     name: "Hill's Science Diet",         sub: 'Adult Chicken & Barley',        price: 5499, compare: 6999, emoji: '🥩', brand: "Hill's",       rating: 4.8, reviews: 2341,  badge: '21% off',         url: 'https://www.chewy.com/s?query=hills+science+diet' },
  { id: '2',  category: 'food',     name: 'Blue Buffalo Life Protection', sub: 'Adult Chicken & Brown Rice',    price: 4899, compare: 5999, emoji: '🐟', brand: 'Blue Buffalo', rating: 4.7, reviews: 8142,  badge: 'Best seller',     url: 'https://www.chewy.com/s?query=blue+buffalo+life+protection' },
  { id: '3',  category: 'food',     name: 'Purina Pro Plan',              sub: 'High Protein Salmon & Rice',    price: 5299, compare: null, emoji: '🥣', brand: 'Purina',       rating: 4.9, reviews: 15203, badge: 'Vet recommended', url: 'https://www.chewy.com/s?query=purina+pro+plan+salmon' },
  { id: '4',  category: 'food',     name: 'Royal Canin Indoor',           sub: 'Adult Dry Cat Food',            price: 4199, compare: 4999, emoji: '🐱', brand: 'Royal Canin',  rating: 4.6, reviews: 6782,  badge: null,              url: 'https://www.chewy.com/s?query=royal+canin+indoor+adult' },
  // Toys
  { id: '5',  category: 'toys',     name: 'KONG Classic',                 sub: 'Durable Rubber Chew Toy',       price: 1299, compare: 1699, emoji: '🎾', brand: 'KONG',         rating: 4.9, reviews: 18432, badge: '#1 Best seller',  url: 'https://www.chewy.com/s?query=kong+classic' },
  { id: '6',  category: 'toys',     name: 'Chuckit! Ultra Ball',          sub: 'High Bounce Fetch Ball 2-pk',   price: 899,  compare: null, emoji: '⚽', brand: 'Chuckit!',     rating: 4.8, reviews: 5621,  badge: null,              url: 'https://www.chewy.com/s?query=chuckit+ultra+ball' },
  { id: '7',  category: 'toys',     name: 'Nina Ottosson Dog Puzzle',     sub: 'Interactive Level 2',           price: 2299, compare: 2799, emoji: '🧩', brand: 'Outward Hound', rating: 4.7, reviews: 3104, badge: 'Staff pick',      url: 'https://www.chewy.com/s?query=nina+ottosson+dog+puzzle' },
  { id: '8',  category: 'toys',     name: 'Yeowww! Catnip Banana',        sub: 'Organic Catnip Toy',            price: 799,  compare: null, emoji: '🍌', brand: 'Yeowww!',      rating: 4.8, reviews: 9231,  badge: 'Cat favorite',    url: 'https://www.chewy.com/s?query=yeowww+catnip+banana' },
  // Beds
  { id: '9',  category: 'beds',     name: 'PetFusion Ultimate Lounge',    sub: 'Memory Foam Dog Bed, Large',    price: 8999, compare: 10999, emoji: '🛏', brand: 'PetFusion',   rating: 4.8, reviews: 4892,  badge: '18% off',         url: 'https://www.chewy.com/s?query=petfusion+ultimate+lounge' },
  { id: '10', category: 'beds',     name: 'K&H Thermo-Kitty Heated',      sub: 'Self-Warming Cat Bed',          price: 4499, compare: 5499, emoji: '🌡', brand: 'K&H',          rating: 4.6, reviews: 2103,  badge: null,              url: 'https://www.chewy.com/s?query=kh+thermo+kitty' },
  // Grooming
  { id: '11', category: 'grooming', name: 'FURminator Deshedding Tool',   sub: 'Long Hair Large Dog',           price: 3299, compare: 3999, emoji: '✂️', brand: 'FURminator',  rating: 4.7, reviews: 22401, badge: '17% off',         url: 'https://www.chewy.com/s?query=furminator+deshedding' },
  { id: '12', category: 'grooming', name: "Burt's Bees Dog Shampoo",      sub: 'Hypoallergenic, Tearless',      price: 999,  compare: null, emoji: '🛁', brand: "Burt's Bees",  rating: 4.6, reviews: 3812,  badge: null,              url: 'https://www.chewy.com/s?query=burts+bees+dog+shampoo' },
  // Health
  { id: '13', category: 'health',   name: 'Zesty Paws Multivitamin',      sub: 'Chewable Bites for Dogs',       price: 2499, compare: 2999, emoji: '💊', brand: 'Zesty Paws',   rating: 4.7, reviews: 11234, badge: 'Top pick',        url: 'https://www.chewy.com/s?query=zesty+paws+multivitamin' },
  { id: '14', category: 'health',   name: 'Vetri-Science Composure',      sub: 'Calming Supplement for Dogs',   price: 1899, compare: null, emoji: '🌿', brand: 'Vetri-Science', rating: 4.5, reviews: 1823, badge: null,              url: 'https://www.chewy.com/s?query=vetri+science+composure' },
  // Travel
  { id: '15', category: 'travel',   name: 'Kurgo Tru-Fit Harness',        sub: 'Crash Tested Car Harness',      price: 3499, compare: 3999, emoji: '🚗', brand: 'Kurgo',        rating: 4.6, reviews: 2891,  badge: null,              url: 'https://www.chewy.com/s?query=kurgo+tru-fit+harness' },
  { id: '16', category: 'travel',   name: 'Ruffwear Front Range Pack',    sub: 'Dog Hiking Backpack',           price: 5999, compare: 6999, emoji: '🎒', brand: 'Ruffwear',     rating: 4.8, reviews: 1204,  badge: '14% off',         url: 'https://www.chewy.com/s?query=ruffwear+front+range+pack' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={10}
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  )
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ShopPage() {
  const [cat, setCat] = useState('all')

  const products = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat)

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px] flex flex-col" style={{ minHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🛍</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Pawfect</span>
              <span className="text-gray-900"> Shop</span>
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            via Chewy
          </span>
        </header>

        {/* Featured banner */}
        <div
          className="rounded-2xl p-4 mb-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#e05a4e,#c44b40)' }}
        >
          <span className="text-4xl">🐾</span>
          <div className="text-white">
            <p className="font-bold text-sm">New adopter discount</p>
            <p className="text-xs opacity-80">20% off your first order with code <strong>PAWFECT20</strong></p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none px-1">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0 ${
                cat === c.value
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--coral)]'
              }`}
              style={cat === c.value ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
          {products.map(p => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Product image area */}
              <div className="h-28 flex items-center justify-center bg-gray-50 relative">
                <span className="text-5xl">{p.emoji}</span>
                {p.badge && (
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: p.badge.includes('%') ? '#22c55e' : '#e05a4e' }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>

              {/* Product info */}
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-[10px] text-gray-400 mb-0.5">{p.brand}</p>
                <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
                <p className="text-[10px] text-gray-400 line-clamp-1 mb-1.5">{p.sub}</p>

                <div className="flex items-center gap-1 mb-1.5">
                  <Stars rating={p.rating} />
                  <span className="text-[10px] text-gray-400">({p.reviews.toLocaleString()})</span>
                </div>

                <div className="mt-auto">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{fmt(p.price)}</span>
                    {p.compare && (
                      <span className="text-[10px] text-gray-400 line-through">{fmt(p.compare)}</span>
                    )}
                  </div>
                  <div
                    className="mt-1.5 w-full py-1.5 rounded-xl text-white text-[11px] font-semibold text-center flex items-center justify-center gap-1"
                    style={{ backgroundColor: '#e05a4e' }}
                  >
                    Shop on Chewy <ExternalLink size={9} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
