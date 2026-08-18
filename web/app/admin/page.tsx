'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Check, X, Eye, EyeOff,
  Flag, AlertTriangle, Building2, BadgeCheck, Trash2,
  Megaphone, Plus, Pencil, MousePointerClick, Store, Star,
} from 'lucide-react'
import type { SponsoredAd, AdPlacement } from '@/types'

type PendingRescue = {
  id: string
  name: string
  ein: string | null
  city: string
  email: string | null
  website: string | null
  verified: boolean
  published?: boolean
  approval_requested_at?: string | null
  created_at: string
}

type PendingStore = {
  id: string
  name: string
  city: string | null
  verified: boolean
  featured?: boolean
  created_at: string
}

type Report = {
  id: string
  reporter_id: string
  content_type: string
  content_id: string
  reason: string
  notes: string | null
  status: string
  created_at: string
  reporter_profile: { first_name: string; avatar: string } | null
}

const REASON_LABELS: Record<string, string> = {
  spam:           '📢 Spam',
  scam:           '⚠️ Scam/Fraud',
  inappropriate:  '🚫 Inappropriate',
  false_info:     '❌ False info',
  animal_safety:  '🐾 Animal safety',
  other:          '📝 Other',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  reviewed:  '#3b82f6',
  dismissed: '#6b7280',
  actioned:  '#22c55e',
}

export default function AdminPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,   setLoading]   = useState(true)
  const [authed,    setAuthed]    = useState(false)
  const [mainTab,   setMainTab]   = useState<'reports' | 'rescues' | 'ads' | 'stores'>('rescues')
  const [reports,   setReports]   = useState<Report[]>([])
  const [rescues,   setRescues]   = useState<PendingRescue[]>([])
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'actioned' | 'dismissed'>('pending')
  const [acting,    setActing]    = useState<string | null>(null)

  // Sponsored ads (house ads — admin-curated, no ad network)
  const [ads,        setAds]        = useState<SponsoredAd[]>([])
  const [showAdForm, setShowAdForm] = useState(false)
  const [editingAd,  setEditingAd]  = useState<string | null>(null)
  const [adSaving,   setAdSaving]   = useState(false)
  const [adError,    setAdError]    = useState<string | null>(null)
  const [adTitle,    setAdTitle]    = useState('')
  const [adBody,     setAdBody]     = useState('')
  const [adEmoji,    setAdEmoji]    = useState('🐾')
  const [adImageUrl, setAdImageUrl] = useState('')
  const [adCtaLabel, setAdCtaLabel] = useState('Learn more')
  const [adCtaUrl,   setAdCtaUrl]   = useState('')
  const [adPlacement, setAdPlacement] = useState<AdPlacement>('shop')
  const [adPriority, setAdPriority] = useState(0)
  const [adActive,   setAdActive]   = useState(true)

  // Pet stores — no in-app checkout, so "featured" is a manually-toggled
  // paid placement (arranged with the seller off-platform); click counts
  // are aggregated from store_products to gauge real buyer interest
  const [stores,      setStores]      = useState<PendingStore[]>([])
  const [storeClicks,  setStoreClicks] = useState<Record<string, number>>({})

  // Check admin role
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles')
        .select('role').eq('id', user.id).single()
      if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        router.replace('/')
        return
      }
      setAuthed(true)
      setLoading(false)
    }
    check()
  }, [supabase, router])

  const fetchReports = useCallback(async () => {
    let q = supabase
      .from('reports')
      .select('*, reporter_profile:profiles!reporter_id(first_name, avatar)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setReports((data ?? []).map((r: any) => ({
      ...r,
      reporter_profile: Array.isArray(r.reporter_profile) ? (r.reporter_profile[0] ?? null) : r.reporter_profile,
    })))
  }, [supabase, filter])

  const fetchRescues = useCallback(async () => {
    // published/approval_requested_at arrive with migration 011 — fall back
    // to the older column list until it's applied
    const first = await supabase
      .from('rescues')
      .select('id, name, ein, city, email, website, verified, published, approval_requested_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    let data = first.data
    if (first.error?.code === '42703') {
      const fallback = await supabase
        .from('rescues')
        .select('id, name, ein, city, email, website, verified, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      data = (fallback.data ?? []) as typeof data
    }
    setRescues((data ?? []) as PendingRescue[])
  }, [supabase])

  const fetchAds = useCallback(async () => {
    const { data } = await supabase
      .from('sponsored_ads')
      .select('*')
      .order('created_at', { ascending: false })
    setAds((data ?? []) as SponsoredAd[])
  }, [supabase])

  const fetchStores = useCallback(async () => {
    // featured arrives with migration 014 — fall back to the older column
    // list until it's applied
    const first = await supabase
      .from('pet_stores')
      .select('id, name, city, verified, featured, created_at')
      .order('created_at', { ascending: false })
    let data = first.data
    if (first.error?.code === '42703') {
      const fallback = await supabase
        .from('pet_stores')
        .select('id, name, city, verified, created_at')
        .order('created_at', { ascending: false })
      data = fallback.data as typeof data
    }
    setStores((data ?? []) as PendingStore[])

    const { data: products } = await supabase
      .from('store_products')
      .select('store_id, clicks')
    const clickTotals: Record<string, number> = {}
    for (const p of (products ?? []) as { store_id: string; clicks: number | null }[]) {
      clickTotals[p.store_id] = (clickTotals[p.store_id] ?? 0) + (p.clicks ?? 0)
    }
    setStoreClicks(clickTotals)
  }, [supabase])

  const toggleFeatured = async (store: PendingStore) => {
    setActing(store.id)
    const { error } = await supabase.from('pet_stores').update({ featured: !store.featured }).eq('id', store.id)
    if (!error) setStores(prev => prev.map(s => s.id === store.id ? { ...s, featured: !s.featured } : s))
    setActing(null)
  }

  useEffect(() => {
    if (authed) {
      (async () => {
        await Promise.all([fetchReports(), fetchRescues(), fetchAds(), fetchStores()])
      })()
    }
  }, [authed, fetchReports, fetchRescues, fetchAds, fetchStores])

  const resetAdForm = () => {
    setEditingAd(null)
    setAdTitle('')
    setAdBody('')
    setAdEmoji('🐾')
    setAdImageUrl('')
    setAdCtaLabel('Learn more')
    setAdCtaUrl('')
    setAdPlacement('shop')
    setAdPriority(0)
    setAdActive(true)
    setAdError(null)
  }

  const startEditAd = (ad: SponsoredAd) => {
    setEditingAd(ad.id)
    setAdTitle(ad.title)
    setAdBody(ad.body ?? '')
    setAdEmoji(ad.emoji)
    setAdImageUrl(ad.image_url ?? '')
    setAdCtaLabel(ad.cta_label)
    setAdCtaUrl(ad.cta_url)
    setAdPlacement(ad.placement)
    setAdPriority(ad.priority)
    setAdActive(ad.active)
    setAdError(null)
    setShowAdForm(true)
  }

  const saveAd = async () => {
    if (!adTitle.trim() || !adCtaUrl.trim()) {
      setAdError('Title and destination link are required.')
      return
    }
    setAdSaving(true)
    setAdError(null)
    const payload = {
      title: adTitle.trim(),
      body: adBody.trim() || null,
      emoji: adEmoji.trim() || '🐾',
      image_url: adImageUrl.trim() || null,
      cta_label: adCtaLabel.trim() || 'Learn more',
      cta_url: adCtaUrl.trim(),
      placement: adPlacement,
      priority: adPriority,
      active: adActive,
    }
    const { error } = editingAd
      ? await supabase.from('sponsored_ads').update(payload).eq('id', editingAd)
      : await supabase.from('sponsored_ads').insert(payload)
    setAdSaving(false)
    if (error) { setAdError(error.message); return }
    setShowAdForm(false)
    resetAdForm()
    fetchAds()
  }

  const toggleAdActive = async (ad: SponsoredAd) => {
    setActing(ad.id)
    await supabase.from('sponsored_ads').update({ active: !ad.active }).eq('id', ad.id)
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, active: !a.active } : a))
    setActing(null)
  }

  const deleteAd = async (id: string) => {
    if (!confirm('Delete this ad? This cannot be undone.')) return
    setActing(id)
    await supabase.from('sponsored_ads').delete().eq('id', id)
    setAds(prev => prev.filter(a => a.id !== id))
    setActing(null)
  }

  const updateReport = async (id: string, status: string) => {
    setActing(id)
    await supabase.from('reports').update({ status }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setActing(null)
  }

  const hideContent = async (report: Report) => {
    setActing(report.id)
    if (report.content_type === 'post') {
      await supabase.from('community_posts').update({ hidden: true }).eq('id', report.content_id)
    } else if (report.content_type === 'event') {
      await supabase.from('events').update({ hidden: true }).eq('id', report.content_id)
    }
    await supabase.from('reports').update({ status: 'actioned' }).eq('id', report.id)
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'actioned' } : r))
    setActing(null)
  }

  const verifyRescue = async (id: string) => {
    setActing(id)
    // Verify also publishes — this is how EIN-less manual-review requests go live
    let { error } = await supabase.from('rescues')
      .update({ verified: true, verified_at: new Date().toISOString(), published: true })
      .eq('id', id)
    if (error?.code === '42703') {
      ({ error } = await supabase.from('rescues')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', id))
    }
    if (!error) setRescues(prev => prev.map(r => r.id === id ? { ...r, verified: true, published: true } : r))
    setActing(null)
  }

  const rejectRescue = async (id: string) => {
    if (!confirm('Delete this rescue and all its data? This cannot be undone.')) return
    setActing(id)
    await supabase.from('rescues').delete().eq('id', id)
    setRescues(prev => prev.filter(r => r.id !== id))
    setActing(null)
  }

  const pendingRescueCount  = rescues.filter(r => !r.verified).length
  const pendingCount        = reports.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!authed) return null

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          {(pendingCount + pendingRescueCount) > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount + pendingRescueCount} pending
            </span>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm mb-4 p-1 gap-1">
          <button
            onClick={() => setMainTab('rescues')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'rescues' ? 'text-white' : 'text-gray-500'
            }`}
            style={mainTab === 'rescues' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Building2 size={14} />
            Rescues
            {pendingRescueCount > 0 && (
              <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingRescueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('reports')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'reports' ? 'text-white' : 'text-gray-500'
            }`}
            style={mainTab === 'reports' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Flag size={14} />
            Reports
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('ads')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'ads' ? 'text-white' : 'text-gray-500'
            }`}
            style={mainTab === 'ads' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Megaphone size={14} />
            Ads
          </button>
          <button
            onClick={() => setMainTab('stores')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'stores' ? 'text-white' : 'text-gray-500'
            }`}
            style={mainTab === 'stores' ? { backgroundColor: '#e05a4e' } : {}}
          >
            <Store size={14} />
            Stores
          </button>
        </div>

        {/* ── STORES TAB ── */}
        {mainTab === 'stores' && (
          <div className="space-y-3 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 leading-relaxed">
              📎 No in-app checkout — sellers link out to where they actually sell (Etsy, PayPal.me, etc).
              &quot;Featured&quot; is a manual boost for sellers you&apos;ve arranged a paid placement with;
              buy-clicks show real interest per store.
            </div>

            {stores.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
                <Store size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">No stores yet</p>
              </div>
            ) : (
              stores.map(store => (
                <div key={store.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate">{store.name}</span>
                        {store.verified && <BadgeCheck size={14} className="text-green-500 flex-shrink-0" />}
                      </div>
                      {store.featured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{store.city || '🌐 Online / ships nationwide'}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                      <span className="flex items-center gap-1"><MousePointerClick size={11} /> {storeClicks[store.id] ?? 0} buy clicks</span>
                      <span>Since {new Date(store.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => toggleFeatured(store)}
                      disabled={acting === store.id}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                        store.featured
                          ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          : 'text-white'
                      }`}
                      style={store.featured ? {} : { backgroundColor: '#f59e0b' }}
                    >
                      {acting === store.id ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                      {store.featured ? 'Remove featured' : 'Make featured'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ADS TAB ── */}
        {mainTab === 'ads' && (
          <div className="space-y-3 pb-6">
            <button
              onClick={() => { resetAdForm(); setShowAdForm(v => !v) }}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                showAdForm
                  ? 'text-gray-600 border-gray-200 bg-white'
                  : 'text-white border-transparent'
              }`}
              style={showAdForm ? {} : { backgroundColor: '#e05a4e' }}
            >
              {showAdForm ? <X size={14} /> : <Plus size={14} />}
              {showAdForm ? 'Cancel' : 'New ad'}
            </button>

            {showAdForm && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <p className="text-sm font-bold text-gray-800">{editingAd ? 'Edit ad' : 'New sponsored ad'}</p>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    value={adTitle}
                    onChange={e => setAdTitle(e.target.value)}
                    placeholder="Happy Paws Pet Food"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Body <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    value={adBody}
                    onChange={e => setAdBody(e.target.value)}
                    placeholder="20% off your first order"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Emoji</label>
                    <input
                      value={adEmoji}
                      onChange={e => setAdEmoji(e.target.value)}
                      placeholder="🐾"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <input
                      type="number"
                      value={adPriority}
                      onChange={e => setAdPriority(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Image URL <span className="text-gray-400 font-normal">(optional — falls back to emoji)</span></label>
                  <input
                    value={adImageUrl}
                    onChange={e => setAdImageUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Button label</label>
                    <input
                      value={adCtaLabel}
                      onChange={e => setAdCtaLabel(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Placement</label>
                    <select
                      value={adPlacement}
                      onChange={e => setAdPlacement(e.target.value as AdPlacement)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                    >
                      <option value="shop">Shop</option>
                      <option value="community">Community</option>
                      <option value="saved">Saved</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Destination link *</label>
                  <input
                    value={adCtaUrl}
                    onChange={e => setAdCtaUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  onClick={() => setAdActive(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full ${
                    adActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {adActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  {adActive ? 'Active — visible to adopters' : 'Inactive — hidden'}
                </button>

                {adError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
                    {adError}
                  </div>
                )}

                <button
                  onClick={saveAd}
                  disabled={adSaving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#e05a4e' }}
                >
                  {adSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingAd ? 'Save changes' : 'Create ad'}
                </button>
              </div>
            )}

            {ads.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
                <Megaphone size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">No ads yet</p>
                <p className="text-xs text-gray-400 mt-1">Add a sponsor to start earning from Shop, Community, or Saved.</p>
              </div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl flex-shrink-0">{ad.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{ad.title}</p>
                          {ad.body && <p className="text-xs text-gray-400 truncate">{ad.body}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${
                        ad.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {ad.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
                      <span className="capitalize bg-gray-50 px-2 py-0.5 rounded-full">{ad.placement}</span>
                      <span className="flex items-center gap-1"><Eye size={11} /> {ad.impressions}</span>
                      <span className="flex items-center gap-1"><MousePointerClick size={11} /> {ad.clicks}</span>
                      <span>Priority {ad.priority}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdActive(ad)}
                        disabled={acting === ad.id}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        {acting === ad.id ? <Loader2 size={11} className="animate-spin" /> : ad.active ? <EyeOff size={11} /> : <Eye size={11} />}
                        {ad.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => startEditAd(ad)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        onClick={() => deleteAd(ad.id)}
                        disabled={acting === ad.id}
                        className="flex-1 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center justify-center gap-1"
                      >
                        {acting === ad.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── RESCUES TAB ── */}
        {mainTab === 'rescues' && (
          <div className="space-y-3 pb-6">
            {rescues.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
                <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">No rescues yet</p>
                <p className="text-xs text-gray-400 mt-1">Shelters that sign up will appear here.</p>
              </div>
            ) : (
              rescues.map(rescue => (
                <div key={rescue.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-gray-900 truncate">{rescue.name}</span>
                          {rescue.verified && (
                            <BadgeCheck size={14} className="text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{rescue.city}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        rescue.verified
                          ? 'bg-green-100 text-green-700'
                          : rescue.approval_requested_at
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rescue.verified ? 'Verified' : rescue.approval_requested_at ? 'Review requested' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-mono mb-0.5">
                      EIN: {rescue.ein ?? <span className="text-amber-600 font-sans font-semibold">none — manual review</span>}
                    </p>
                    {rescue.published === false && (
                      <p className="text-[10px] font-semibold text-gray-400 mb-0.5">DRAFT — not visible to adopters</p>
                    )}
                    {rescue.email && <p className="text-xs text-gray-400 mb-0.5">{rescue.email}</p>}
                    {rescue.website && (
                      <a href={rescue.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline">
                        {rescue.website}
                      </a>
                    )}
                    <p className="text-[10px] text-gray-300 mt-1">
                      Submitted {new Date(rescue.created_at).toLocaleDateString()}
                    </p>

                    {!rescue.verified && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => rejectRescue(rescue.id)}
                          disabled={acting === rescue.id}
                          className="flex-1 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center justify-center gap-1"
                        >
                          {acting === rescue.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Reject
                        </button>
                        <button
                          onClick={() => verifyRescue(rescue.id)}
                          disabled={acting === rescue.id}
                          className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          {acting === rescue.id ? <Loader2 size={11} className="animate-spin" /> : <BadgeCheck size={11} />}
                          Verify
                        </button>
                      </div>
                    )}

                    {rescue.verified && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <Check size={11} /> Verified shelter
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {mainTab === 'reports' && (
        <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['all', 'pending', 'actioned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s === filter ? 'all' : s)}
              className={`rounded-2xl p-3 text-center transition-all ${
                filter === s ? 'shadow-md' : 'bg-white/80 shadow-sm'
              }`}
              style={filter === s ? { backgroundColor: STATUS_COLORS[s] ?? '#e05a4e' } : {}}
            >
              <p className={`text-xl font-bold ${filter === s ? 'text-white' : 'text-gray-900'}`}>
                {s === 'all'
                  ? reports.length
                  : reports.filter(r => r.status === s).length}
              </p>
              <p className={`text-[10px] capitalize ${filter === s ? 'text-white/80' : 'text-gray-500'}`}>
                {s}
              </p>
            </button>
          ))}
        </div>

        {/* Reports list */}
        <div className="space-y-3 pb-6" style={{ display: mainTab === 'reports' ? undefined : 'none' }}>
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
              <Flag size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No reports</p>
              <p className="text-xs text-gray-400 mt-1">
                {filter === 'pending' ? 'All clear!' : `No ${filter} reports.`}
              </p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-gray-800">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white`}
                          style={{ backgroundColor: STATUS_COLORS[report.status] ?? '#6b7280' }}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {report.content_type} · {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-lg flex-shrink-0">
                      {report.reporter_profile?.avatar ?? '🙂'}
                    </div>
                  </div>

                  {/* Reporter */}
                  <p className="text-xs text-gray-500 mb-1">
                    Reported by: <span className="font-medium">{report.reporter_profile?.first_name ?? 'Unknown'}</span>
                  </p>

                  {/* Notes */}
                  {report.notes && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2 mb-2">
                      &quot;{report.notes}&quot;
                    </p>
                  )}

                  {/* Content ID */}
                  <p className="text-[10px] text-gray-300 font-mono mb-3 truncate">
                    ID: {report.content_id}
                  </p>

                  {/* Actions */}
                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateReport(report.id, 'dismissed')}
                        disabled={acting === report.id}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        {acting === report.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                        Dismiss
                      </button>
                      {(report.content_type === 'post' || report.content_type === 'event') && (
                        <button
                          onClick={() => hideContent(report)}
                          disabled={acting === report.id}
                          className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1"
                          style={{ backgroundColor: '#e05a4e' }}
                        >
                          {acting === report.id ? <Loader2 size={11} className="animate-spin" /> : <EyeOff size={11} />}
                          Hide content
                        </button>
                      )}
                      <button
                        onClick={() => updateReport(report.id, 'reviewed')}
                        disabled={acting === report.id}
                        className="flex-1 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600 flex items-center justify-center gap-1"
                      >
                        {acting === report.id ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
                        Reviewed
                      </button>
                    </div>
                  )}

                  {report.status !== 'pending' && (
                    <button
                      onClick={() => updateReport(report.id, 'pending')}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <AlertTriangle size={10} /> Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}

      </div>
    </div>
  )
}
