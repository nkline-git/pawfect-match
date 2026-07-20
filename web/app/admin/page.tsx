'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Check, X, Eye, EyeOff,
  Flag, AlertTriangle, Building2, BadgeCheck, Trash2,
} from 'lucide-react'

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
  const [mainTab,   setMainTab]   = useState<'reports' | 'rescues'>('rescues')
  const [reports,   setReports]   = useState<Report[]>([])
  const [rescues,   setRescues]   = useState<PendingRescue[]>([])
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'actioned' | 'dismissed'>('pending')
  const [acting,    setActing]    = useState<string | null>(null)

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
    let { data, error } = await supabase
      .from('rescues')
      .select('id, name, ein, city, email, website, verified, published, approval_requested_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error?.code === '42703') {
      const fallback = await supabase
        .from('rescues')
        .select('id, name, ein, city, email, website, verified, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      data = (fallback.data ?? []) as typeof data
    }
    setRescues((data ?? []) as PendingRescue[])
  }, [supabase])

  useEffect(() => {
    if (authed) { fetchReports(); fetchRescues() }
  }, [authed, fetchReports, fetchRescues])

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
        </div>

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
                      "{report.notes}"
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
