'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/ui/BottomNav'
import {
  Heart, Send, Loader2, RefreshCw,
  Calendar, MapPin, Plus, Flag, X, Check,
} from 'lucide-react'
import Link from 'next/link'

// ── Topics ─────────────────────────────────────────────────────────
const POST_TOPICS = [
  { value: 'general',    label: 'General',      icon: '🐾' },
  { value: 'advice',     label: 'Advice',        icon: '💡' },
  { value: 'health',     label: 'Health',        icon: '🏥' },
  { value: 'training',   label: 'Training',      icon: '🎓' },
  { value: 'stories',    label: 'Stories',       icon: '❤️' },
  { value: 'lost_found', label: 'Lost & Found',  icon: '🔍' },
]

const TOPIC_COLORS: Record<string, string> = {
  general:    '#6b7280',
  advice:     '#8b5cf6',
  health:     '#ef4444',
  training:   '#f59e0b',
  stories:    '#e05a4e',
  lost_found: '#3b82f6',
}

const EVENT_TYPES: Record<string, { icon: string; color: string; label: string }> = {
  adoption_event: { icon: '🐾', color: '#e05a4e', label: 'Adoption Event' },
  fundraiser:     { icon: '💰', color: '#8b5cf6', label: 'Fundraiser' },
  volunteer_day:  { icon: '🤝', color: '#22c55e', label: 'Volunteer Day' },
  training:       { icon: '🎓', color: '#f59e0b', label: 'Training' },
  meetup:         { icon: '☕', color: '#3b82f6', label: 'Meetup' },
  other:          { icon: '📅', color: '#6b7280', label: 'Event' },
}

// ── Types ──────────────────────────────────────────────────────────
type PostProfile = { first_name: string; avatar: string }
type Post = {
  id: string; user_id: string; content: string; topic: string
  likes: number; created_at: string; profile: PostProfile | null; liked: boolean
}
type CommunityEvent = {
  id: string; title: string; event_type: string
  location: string | null; starts_at: string; rescue_id: string | null
  rescue: { name: string; logo: string } | null
  profile: PostProfile | null
}

// ── Report modal ───────────────────────────────────────────────────
const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam or repetitive content' },
  { value: 'scam',           label: 'Scam or fraud' },
  { value: 'inappropriate',  label: 'Inappropriate content' },
  { value: 'false_info',     label: 'False information' },
  { value: 'animal_safety',  label: 'Animal safety concern' },
  { value: 'other',          label: 'Other' },
]

function ReportModal({
  contentType, contentId, onClose,
}: { contentType: 'post' | 'event'; contentId: string; onClose: () => void }) {
  const supabase = createClient()
  const [reason,      setReason]      = useState('')
  const [notes,       setNotes]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { onClose(); return }
    await supabase.from('reports').upsert({
      reporter_id:  user.id,
      content_type: contentType,
      content_id:   contentId,
      reason,
      notes: notes.trim() || null,
    }, { onConflict: 'reporter_id,content_type,content_id' })
    setSubmitting(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-[390px] bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Report {contentType}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check size={22} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Report submitted</p>
            <p className="text-sm text-gray-500 mt-1">Our team will review it shortly.</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 mb-3">Why are you reporting this?</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${
                    reason === r.value
                      ? 'border-transparent font-medium text-red-600'
                      : 'border-gray-100 text-gray-700 bg-gray-50 hover:border-gray-200'
                  }`}
                  style={reason === r.value ? { backgroundColor: '#fef2f2', borderColor: '#fca5a5' } : {}}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional details (optional)"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-4 placeholder:text-gray-400"
            />
            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#e05a4e' }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Event create form ──────────────────────────────────────────────
function CreateEventForm({ userId, onCreated }: { userId: string; onCreated: (ev: CommunityEvent) => void }) {
  const supabase = createClient()
  const [title,     setTitle]     = useState('')
  const [desc,      setDesc]      = useState('')
  const [evType,    setEvType]    = useState('adoption_event')
  const [location,  setLocation]  = useState('')
  const [startsAt,  setStartsAt]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim() || !startsAt) { setError('Title and date are required.'); return }
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: userId, title: title.trim(), description: desc.trim() || null,
        event_type: evType, location: location.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
      })
      .select('id, title, event_type, location, starts_at, rescue_id')
      .single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated({ ...data, rescue: null, profile: null })
    setTitle(''); setDesc(''); setLocation(''); setStartsAt('')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3.5 mb-3">
      <p className="text-sm font-semibold text-gray-700 mb-3">Create event</p>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Event title *"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none mb-2 placeholder:text-gray-400"
        onFocus={e => e.target.style.borderColor = '#e05a4e'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      <div className="flex gap-2 mb-2">
        <select
          value={evType}
          onChange={e => setEvType(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-700"
        >
          {Object.entries(EVENT_TYPES).map(([v, m]) => (
            <option key={v} value={v}>{m.icon} {m.label}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={e => setStartsAt(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700"
          onFocus={e => e.target.style.borderColor = '#e05a4e'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
      </div>
      <input
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none mb-2 placeholder:text-gray-400"
        onFocus={e => e.target.style.borderColor = '#e05a4e'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none mb-2 placeholder:text-gray-400"
        onFocus={e => e.target.style.borderColor = '#e05a4e'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
        style={{ backgroundColor: '#e05a4e' }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Create event</>}
      </button>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ── Main page ──────────────────────────────────────────────────────
export default function CommunityPage() {
  const supabase = createClient()

  const [mainTab,      setMainTab]      = useState<'posts' | 'events'>('posts')
  const [posts,        setPosts]        = useState<Post[]>([])
  const [events,       setEvents]       = useState<CommunityEvent[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingEvts,  setLoadingEvts]  = useState(true)
  const [postTopic,    setPostTopic]    = useState('general')
  const [content,      setContent]      = useState('')
  const [posting,      setPosting]      = useState(false)
  const [postError,    setPostError]    = useState<string | null>(null)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [userProfile,  setUserProfile]  = useState<PostProfile | null>(null)
  const [dbMissing,    setDbMissing]    = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'event'; id: string } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        supabase.from('profiles').select('first_name, avatar').eq('id', data.user.id).single()
          .then(({ data: p }) => { if (p) setUserProfile(p) })
      }
    })
  }, [supabase])

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true)
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, user_id, content, topic, likes, created_at, profile:profiles(first_name, avatar)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error?.code === '42P01') { setDbMissing(true); setLoadingPosts(false); return }
    if (error) { setLoadingPosts(false); return }

    let likedSet = new Set<string>()
    if (userId) {
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', userId)
      if (likes) likedSet = new Set(likes.map((l: { post_id: string }) => l.post_id))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPosts((data ?? []).map((p: any) => ({
      id: p.id, user_id: p.user_id, content: p.content, topic: p.topic,
      likes: p.likes, created_at: p.created_at,
      profile: Array.isArray(p.profile) ? (p.profile[0] ?? null) : (p.profile ?? null),
      liked: likedSet.has(p.id),
    })))
    setLoadingPosts(false)
  }, [supabase, userId])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoadingEvts(true)
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_type, location, starts_at, rescue_id, rescue:rescues(name, logo)')
      .eq('status', 'active')
      .order('starts_at', { ascending: true })
      .limit(30)
    if (error?.code === '42P01') { setLoadingEvts(false); return }
    if (error) { setLoadingEvts(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEvents((data ?? []).map((e: any) => ({
      ...e,
      rescue:  Array.isArray(e.rescue) ? (e.rescue[0] ?? null) : (e.rescue ?? null),
      profile: null,
    })))
    setLoadingEvts(false)
  }, [supabase])

  useEffect(() => { fetchPosts() }, [fetchPosts])
  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Like handler
  const handleLike = async (post: Post) => {
    if (!userId) return
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ))
    if (post.liked) {
      await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', post.id)
      await supabase.from('community_posts').update({ likes: post.likes - 1 }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: post.id })
      await supabase.from('community_posts').update({ likes: post.likes + 1 }).eq('id', post.id)
    }
  }

  // Post handler
  const handlePost = async () => {
    if (!content.trim() || !userId) return
    setPosting(true); setPostError(null)
    const { data, error } = await supabase
      .from('community_posts')
      .insert({ user_id: userId, content: content.trim(), topic: postTopic })
      .select('id, user_id, content, topic, likes, created_at')
      .single()
    setPosting(false)
    if (error) { setPostError('Could not post. Please try again.'); return }
    setPosts(prev => [{ ...data, profile: userProfile, liked: false }, ...prev])
    setContent('')
    if (textRef.current) textRef.current.style.height = 'auto'
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const fmtEventDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px] flex flex-col" style={{ minHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🐾</span>
            <span className="text-xl font-bold">
              <span style={{ color: '#e05a4e' }}>Pawfect</span>
              <span className="text-gray-900"> Community</span>
            </span>
          </div>
          <button onClick={() => { fetchPosts(); fetchEvents() }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </header>

        {/* Main tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm mb-3 p-1 gap-1">
          {(['posts', 'events'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                mainTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={mainTab === tab ? { backgroundColor: '#e05a4e' } : {}}
            >
              {tab === 'posts' ? '💬' : '📅'}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* DB missing notice */}
        {dbMissing && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚙️ One-time setup needed</p>
            <p className="text-xs leading-relaxed">
              Run <code className="bg-amber-100 px-1 rounded">002_community_posts.sql</code> and{' '}
              <code className="bg-amber-100 px-1 rounded">003_preferences_events_reports.sql</code>{' '}
              in your Supabase SQL editor.
            </p>
          </div>
        )}

        {/* ── POSTS TAB ── */}
        {mainTab === 'posts' && (
          <>
            {/* Topic filters */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none px-1">
              <button
                onClick={() => setPostTopic('all')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0 ${
                  postTopic === 'all' ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={postTopic === 'all' ? { backgroundColor: '#e05a4e' } : {}}
              >
                💬 All
              </button>
              {POST_TOPICS.map(t => (
                <button key={t.value}
                  onClick={() => setPostTopic(t.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0 ${
                    postTopic === t.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                  style={postTopic === t.value ? { backgroundColor: TOPIC_COLORS[t.value] ?? '#e05a4e' } : {}}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Compose */}
            {userId && !dbMissing && (
              <div className="bg-white rounded-2xl shadow-sm p-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                    {userProfile?.avatar ?? '🙂'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      ref={textRef}
                      value={content}
                      onChange={autoResize}
                      placeholder="Share a tip, story, or question…"
                      rows={2}
                      maxLength={1000}
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
                      style={{ minHeight: '2.5rem' }}
                    />
                    {content.length > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                          {POST_TOPICS.map(t => (
                            <button key={t.value}
                              onClick={() => setPostTopic(t.value)}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all whitespace-nowrap ${
                                postTopic === t.value ? 'text-white border-transparent' : 'text-gray-500 border-gray-200'
                              }`}
                              style={postTopic === t.value ? { backgroundColor: TOPIC_COLORS[t.value] } : {}}
                            >
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={handlePost} disabled={posting || !content.trim()}
                          className="ml-2 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                          style={{ backgroundColor: '#e05a4e' }}>
                          {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {postError && <p className="text-xs text-red-600 mt-2 pl-10">{postError}</p>}
              </div>
            )}

            {!userId && !dbMissing && (
              <a href="/login" className="block text-center text-sm font-medium py-2.5 rounded-2xl mb-3 text-white"
                style={{ backgroundColor: '#e05a4e' }}>
                Sign in to post & like
              </a>
            )}

            {/* Posts feed */}
            <div className="flex-1 flex flex-col gap-3 pb-4">
              {loadingPosts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm animate-pulse">
                    <div className="flex gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                        <div className="h-2.5 bg-gray-100 rounded w-16" />
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-10">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                    </div>
                  </div>
                ))
              ) : (
                (postTopic === 'all' ? posts : posts.filter(p => p.topic === postTopic)).map(post => (
                  <article key={post.id} className="bg-white rounded-2xl shadow-sm p-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
                        {post.profile?.avatar ?? '🙂'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {post.profile?.first_name ?? 'Pawfect user'}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                              style={{ backgroundColor: TOPIC_COLORS[post.topic] ?? '#6b7280' }}>
                              {POST_TOPICS.find(t => t.value === post.topic)?.icon}{' '}
                              {POST_TOPICS.find(t => t.value === post.topic)?.label ?? post.topic}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(post.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => handleLike(post)} disabled={!userId}
                            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full transition-all ${
                              post.liked ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50'
                            }`}>
                            <Heart size={12} fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" />
                            {post.likes > 0 ? post.likes : ''}
                          </button>
                          {userId && (
                            <button onClick={() => setReportTarget({ type: 'post', id: post.id })}
                              className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-gray-500 px-2 py-1 rounded-full hover:bg-gray-50 transition-all">
                              <Flag size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}

              {!loadingPosts && posts.filter(p => postTopic === 'all' || p.topic === postTopic).length === 0 && !dbMissing && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-5xl mb-3">🐾</span>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No posts yet</p>
                  <p className="text-xs text-gray-400">
                    {userId ? 'Be the first to start a conversation!' : 'Sign in to be the first to post!'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── EVENTS TAB ── */}
        {mainTab === 'events' && (
          <>
            {userId && (
              <div className="mb-3">
                <button
                  onClick={() => setShowEventForm(v => !v)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all"
                  style={showEventForm
                    ? { backgroundColor: '#fef2f2', borderColor: '#e05a4e', color: '#e05a4e' }
                    : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }}
                >
                  <Plus size={15} />
                  {showEventForm ? 'Cancel' : 'Post an event'}
                </button>
              </div>
            )}

            {showEventForm && userId && (
              <CreateEventForm
                userId={userId}
                onCreated={ev => {
                  setEvents(prev => [ev, ...prev])
                  setShowEventForm(false)
                }}
              />
            )}

            <div className="flex-1 flex flex-col gap-3 pb-4">
              {loadingEvts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))
              ) : events.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-5xl mb-3">📅</span>
                  <p className="text-sm font-semibold text-gray-700 mb-1">No upcoming events</p>
                  <p className="text-xs text-gray-400">
                    {userId ? 'Be the first to post one!' : 'Sign in to post an event.'}
                  </p>
                </div>
              ) : (
                events.map(ev => {
                  const meta = EVENT_TYPES[ev.event_type] ?? EVENT_TYPES.other
                  return (
                    <Link key={ev.id} href={`/events/${ev.id}`}
                      className="bg-white rounded-2xl shadow-sm p-3.5 hover:shadow-md transition-shadow block">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ backgroundColor: `${meta.color}18` }}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{ev.title}</p>
                            {userId && (
                              <button
                                onClick={e => { e.preventDefault(); setReportTarget({ type: 'event', id: ev.id }) }}
                                className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
                              >
                                <Flag size={11} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                            <Calendar size={10} />
                            {fmtEventDate(ev.starts_at)}
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                              <MapPin size={10} />
                              {ev.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: meta.color }}>
                              {meta.icon} {meta.label}
                            </span>
                            {(ev.rescue || ev.profile) && (
                              <span className="text-[10px] text-gray-400 truncate">
                                by {ev.rescue?.name ?? ev.profile?.first_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </>
        )}

        <BottomNav />
      </div>

      {/* Report modal */}
      {reportTarget && (
        <ReportModal
          contentType={reportTarget.type}
          contentId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  )
}
