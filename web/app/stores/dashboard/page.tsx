'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/hooks/useStore'
import { Loader2, Check, LogOut, ExternalLink, Share2, Plus, Trash2, PackageOpen, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { StoreProduct } from '@/types'

const LOGO_OPTIONS = ['🏪', '🐾', '🐕', '🐱', '🦮', '🐟', '🐦', '🌿', '🦴', '🛁', '🌟', '💛']

const COVER_GRADIENTS = [
  { label: 'Ocean',   value: 'linear-gradient(135deg,#1A4A9C,#2D7DD2)' },
  { label: 'Coral',   value: 'linear-gradient(135deg,#e05a4e,#c44b40)' },
  { label: 'Forest',  value: 'linear-gradient(135deg,#059669,#10b981)' },
  { label: 'Purple',  value: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { label: 'Sunset',  value: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { label: 'Slate',   value: 'linear-gradient(135deg,#374151,#6b7280)' },
]

const SPECIALTY_OPTIONS = [
  'Organic food', 'Raw food', 'Grooming', 'Training',
  'Boarding', 'Doggy daycare', 'Aquatics', 'Reptiles',
  'Birds', 'Farm animals', 'Holistic care', 'Adoption support',
]

// ── Store events: sales, workshops, adoption days ────────────────
const STORE_EVENT_TYPES = [
  { value: 'sale',           label: '🏷️ Sale'           },
  { value: 'workshop',       label: '🎓 Workshop'        },
  { value: 'adoption_event', label: '🐾 Adoption Event'  },
  { value: 'meetup',         label: '☕ Meetup'           },
  { value: 'other',          label: '📅 Other'           },
]

type StoreEvent = {
  id: string
  title: string
  event_type: string
  location: string | null
  starts_at: string
  status: string
}

function StoreEventsManager({ storeId, userId }: { storeId: string; userId: string }) {
  const supabase = createClient()
  const [events,    setEvents]    = useState<StoreEvent[]>([])
  const [available, setAvailable] = useState<boolean | null>(null) // false = 007 not applied
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [eTitle,    setETitle]    = useState('')
  const [eType,     setEType]     = useState('sale')
  const [eLocation, setELocation] = useState('')
  const [eDate,     setEDate]     = useState('')
  const [eTime,     setETime]     = useState('')
  const [eDesc,     setEDesc]     = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_type, location, starts_at, status')
      .eq('store_id', storeId)
      .order('starts_at', { ascending: true })
      .limit(20)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setEvents((data ?? []) as StoreEvent[])
  }
  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const addEvent = async () => {
    if (!eTitle.trim()) { setError('Event title is required.'); return }
    if (!eDate)         { setError('Event date is required.'); return }
    setSaving(true); setError(null)
    const startsAt = new Date(`${eDate}T${eTime || '12:00'}`)
    const { error } = await supabase.from('events').insert({
      user_id:     userId,
      store_id:    storeId,
      title:       eTitle.trim(),
      description: eDesc.trim() || null,
      event_type:  eType,
      location:    eLocation.trim() || null,
      starts_at:   startsAt.toISOString(),
      status:      'active',
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setETitle(''); setELocation(''); setEDate(''); setETime(''); setEDesc(''); setEType('sale')
    setShowForm(false)
    load()
  }

  const removeEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    load()
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (available === null) return null
  if (available === false) return null  // 007 migration not applied yet

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-1.5">
          <Calendar size={16} className="text-gray-400" /> Your events
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full text-white"
          style={{ backgroundColor: '#e05a4e' }}
        >
          <Plus size={12} /> {showForm ? 'Close' : 'New event'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-100 rounded-xl p-3.5 mb-3 space-y-3 bg-gray-50">
          <input
            value={eTitle} onChange={e => setETitle(e.target.value)}
            placeholder="Event title * (e.g. Spring Sale — 20% off toys)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          />
          <div className="flex flex-wrap gap-1.5">
            {STORE_EVENT_TYPES.map(t => (
              <button key={t.value} onClick={() => setEType(t.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  eType === t.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={eType === t.value ? { backgroundColor: '#e05a4e' } : {}}>{t.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={eDate} onChange={e => setEDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700 bg-white" />
            <input type="time" value={eTime} onChange={e => setETime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700 bg-white" />
          </div>
          <input
            value={eLocation} onChange={e => setELocation(e.target.value)}
            placeholder="Location (defaults to your store)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          />
          <textarea
            value={eDesc} onChange={e => setEDesc(e.target.value)}
            placeholder="Details (optional)" rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none bg-white"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={addEvent} disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Publish event
          </button>
        </div>
      )}

      {events.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No events yet. Sales and workshops you post<br />show up on your store page.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const past = new Date(ev.starts_at) < new Date()
            const typeMeta = STORE_EVENT_TYPES.find(t => t.value === ev.event_type)
            return (
              <div key={ev.id} className={`flex items-start justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2.5 ${past ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {typeMeta?.label ?? ev.event_type} · {fmtDate(ev.starts_at)}{past && ' · past'}
                  </p>
                  {ev.location && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {ev.location}
                    </p>
                  )}
                </div>
                <button onClick={() => removeEvent(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const PRODUCT_CATEGORIES = ['food', 'treats', 'toys', 'beds', 'grooming', 'health', 'travel', 'other'] as const
const PRODUCT_EMOJIS = ['🛍️', '🥩', '🦴', '🎾', '🛏️', '✂️', '💊', '🚗', '🧸', '🥫', '🍪', '🐟']

// ── Products manager: the store's own shelf ─────────────────────
function ProductsManager({ storeId }: { storeId: string }) {
  const supabase = createClient()
  const [products,   setProducts]   = useState<StoreProduct[]>([])
  const [available,  setAvailable]  = useState<boolean | null>(null) // null = loading; false = 004 not applied
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [pName,  setPName]  = useState('')
  const [pDesc,  setPDesc]  = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pCompare, setPCompare] = useState('')
  const [pEmoji, setPEmoji] = useState('🛍️')
  const [pCat,   setPCat]   = useState<string>('food')
  const [pBuyUrl, setPBuyUrl] = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('store_products').select('*').eq('store_id', storeId)
      .order('sort').order('created_at')
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setProducts((data ?? []) as StoreProduct[])
  }
  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const addProduct = async () => {
    if (!pName.trim()) { setError('Product name is required.'); return }
    setSaving(true); setError(null)
    const priceCents   = pPrice.trim()   ? Math.round(parseFloat(pPrice) * 100)   : null
    const compareCents = pCompare.trim() ? Math.round(parseFloat(pCompare) * 100) : null
    const { error } = await supabase.from('store_products').insert({
      store_id: storeId,
      name: pName.trim(),
      description: pDesc.trim() || null,
      price: Number.isFinite(priceCents) ? priceCents : null,
      compare_at: Number.isFinite(compareCents) ? compareCents : null,
      emoji: pEmoji,
      category: pCat,
      buy_url: pBuyUrl.trim() || null,
      in_stock: true,
      sort: products.length,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setPName(''); setPDesc(''); setPPrice(''); setPCompare(''); setPEmoji('🛍️'); setPCat('food'); setPBuyUrl('')
    setShowForm(false)
    load()
  }

  const removeProduct = async (id: string) => {
    await supabase.from('store_products').delete().eq('id', id)
    load()
  }

  const toggleStock = async (p: StoreProduct) => {
    await supabase.from('store_products').update({ in_stock: !p.in_stock }).eq('id', p.id)
    load()
  }

  if (available === null) return null
  if (available === false) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm px-4 py-3 mb-4 text-xs text-gray-500 leading-relaxed">
        🛒 <strong>Products coming soon</strong> — the store products feature needs a database
        update (migration <code>004_store_products.sql</code>). Once applied, you can showcase
        your products right on your store page.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-1.5">
          <PackageOpen size={16} className="text-gray-400" /> Your products
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full text-white"
          style={{ backgroundColor: '#e05a4e' }}
        >
          <Plus size={12} /> Add product
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-100 rounded-xl p-3.5 mb-3 space-y-3 bg-gray-50">
          <input
            value={pName} onChange={e => setPName(e.target.value)}
            placeholder="Product name *"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          />
          <textarea
            value={pDesc} onChange={e => setPDesc(e.target.value)}
            placeholder="Short description (optional)" rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={pPrice} onChange={e => setPPrice(e.target.value)}
              placeholder="Price ($)" inputMode="decimal"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
            />
            <input
              value={pCompare} onChange={e => setPCompare(e.target.value)}
              placeholder="Was ($, optional)" inputMode="decimal"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_EMOJIS.map(e => (
              <button key={e} onClick={() => setPEmoji(e)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border-2 transition-all ${
                  pEmoji === e ? 'border-[#e05a4e] bg-red-50' : 'border-transparent bg-white'
                }`}>{e}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_CATEGORIES.map(c => (
              <button key={c} onClick={() => setPCat(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize transition-all ${
                  pCat === c ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={pCat === c ? { backgroundColor: '#e05a4e' } : {}}>{c}</button>
            ))}
          </div>
          <div>
            <input
              value={pBuyUrl} onChange={e => setPBuyUrl(e.target.value)}
              placeholder="Buy link (optional) — Etsy, PayPal.me, Instagram, your site…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              No in-app checkout yet — this shows a &quot;Buy&quot; button that sends shoppers to wherever you actually sell it.
            </p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={addProduct} disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#e05a4e' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Add to your shelf
          </button>
        </div>
      )}

      {products.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No products yet. Add a few bestsellers so shoppers<br />can see what you carry!
        </p>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className={`flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2.5 ${!p.in_stock ? 'opacity-50' : ''}`}>
              <span className="text-2xl flex-shrink-0">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-[11px] text-gray-400">
                  {p.price != null ? `$${(p.price / 100).toFixed(2)}` : 'Ask in store'}
                  {p.compare_at ? ` · was $${(p.compare_at / 100).toFixed(2)}` : ''}
                  {' · '}<span className="capitalize">{p.category}</span>
                  {p.buy_url ? ` · ${p.clicks ?? 0} buy click${p.clicks === 1 ? '' : 's'}` : ''}
                </p>
              </div>
              <button onClick={() => toggleStock(p)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full ${p.in_stock ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {p.in_stock ? 'In stock' : 'Hidden'}
              </button>
              <button onClick={() => removeProduct(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StoreDashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { store, loading: storeLoading, updateStore } = useStore()

  const [authed,  setAuthed]  = useState<boolean | null>(null)
  const [userId,  setUserId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Form state (populated from store once loaded)
  const [logo,        setLogo]        = useState('🏪')
  const [cover,       setCover]       = useState(COVER_GRADIENTS[0].value)
  const [name,        setName]        = useState('')
  const [city,        setCity]        = useState('')
  const [address,     setAddress]     = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [website,     setWebsite]     = useState('')
  const [description, setDescription] = useState('')
  const [hours,       setHours]       = useState('')
  const [instagram,   setInstagram]   = useState('')
  const [facebook,    setFacebook]    = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login?next=%2Fstores%2Fdashboard')
      else { setAuthed(true); setUserId(data.user.id) }
    })
  }, [supabase, router])

  // Populate form when store data loads
  useEffect(() => {
    if (store) {
      setLogo(store.logo)
      setCover(store.cover_color)
      setName(store.name)
      setCity(store.city ?? '')
      setAddress(store.address ?? '')
      setPhone(store.phone ?? '')
      setEmail(store.email ?? '')
      setWebsite(store.website ?? '')
      setDescription(store.description ?? '')
      setHours(store.hours ?? '')
      setInstagram(store.instagram ?? '')
      setFacebook(store.facebook ?? '')
      setSpecialties(store.specialties)
      setAnnouncement(store.announcement ?? '')
    }
  }, [store])

  const toggleSpecialty = (s: string) =>
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    if (!name.trim()) { setError('Store name is required.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await updateStore({
      logo,
      cover_color: cover,
      name: name.trim(),
      city: city.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      hours: hours.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      specialties,
      // Only send announcement when the 004 column exists (key present in the row)
      ...(store && 'announcement' in store ? { announcement: announcement.trim() || null } : {}),
    })
    setSaving(false)
    if (err) { setError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (authed === null || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🏪</span>
        <p className="text-white font-semibold text-center">No store profile found.</p>
        <a
          href="/stores/register"
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#e05a4e' }}
        >
          Create your store page →
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{store.logo}</span>
            <div>
              <h1 className="text-white font-bold leading-tight">{store.name}</h1>
              <p className="text-white/60 text-xs">{store.city || '🌐 Online / ships nationwide'}</p>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link
            href={`/stores/${store.id}`}
            className="flex items-center justify-center gap-1.5 bg-white rounded-xl py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <ExternalLink size={13} className="text-gray-400" />
            View public page
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: store.name, url: `${window.location.origin}/stores/${store.id}` })
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/stores/${store.id}`)
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-white rounded-xl py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <Share2 size={13} className="text-gray-400" />
            Share page
          </button>
        </div>

        {/* Products manager — the store's own shelf */}
        <ProductsManager storeId={store.id} />

        {/* Events manager — sales, workshops, adoption days */}
        {userId && <StoreEventsManager storeId={store.id} userId={userId} />}

        {/* Edit profile card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4 mb-6">
          <h2 className="font-bold text-gray-900">Edit store profile</h2>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="h-16" style={{ background: cover }} />
            <div className="bg-gray-50 px-3 pb-3 pt-0">
              <div className="flex items-end gap-2 -mt-5 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">
                  {logo}
                </div>
                <p className="pb-0.5 text-xs font-bold text-gray-800">{name || 'Store name'}</p>
              </div>
            </div>
          </div>

          {/* Cover gradient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover color</label>
            <div className="flex gap-2">
              {COVER_GRADIENTS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setCover(g.value)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    cover === g.value ? 'ring-2 ring-offset-1 ring-[#e05a4e] scale-110' : ''
                  }`}
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo emoji</label>
            <div className="flex flex-wrap gap-2">
              {LOGO_OPTIONS.map(l => (
                <button
                  key={l}
                  onClick={() => setLogo(l)}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border-2 transition-all ${
                    logo === l ? 'border-[#e05a4e] bg-red-50 scale-110' : 'border-transparent bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              City <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Leave blank if you sell online or from home"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hours</label>
            <input
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="Mon–Sat 10am–6pm"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">About your store</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell pet owners what makes your store special…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
              onFocus={e => e.target.style.borderColor = '#e05a4e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Announcement — only when 004 migration is applied */}
          {store && 'announcement' in store && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">📣 Announcement banner</label>
              <textarea
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder="e.g. 15% off for new adopters this month! Show your Pawfect Match profile at checkout."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 resize-none"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              <p className="text-[11px] text-gray-400 mt-1">Shows as a highlighted deal banner at the top of your store page.</p>
            </div>
          )}

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    specialties.includes(s)
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={specialties.includes(s) ? { backgroundColor: '#e05a4e', borderColor: '#e05a4e' } : {}}
                >
                  {specialties.includes(s) && <Check size={11} />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
              <input
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="@yourstore"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook</label>
              <input
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                placeholder="yourpage"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none transition-all placeholder:text-gray-400"
                onFocus={e => e.target.style.borderColor = '#e05a4e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: saved ? '#22c55e' : '#e05a4e' }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saved ? '✓ Changes saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
