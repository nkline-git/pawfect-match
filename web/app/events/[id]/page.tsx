'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, MapPin, Clock, ExternalLink,
  Loader2, Calendar, Users,
} from 'lucide-react'
import Link from 'next/link'
import type { PawfectEvent } from '@/types'

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  adoption_event: { label: 'Adoption Event',  icon: '🐾', color: '#e05a4e' },
  fundraiser:     { label: 'Fundraiser',       icon: '💰', color: '#8b5cf6' },
  volunteer_day:  { label: 'Volunteer Day',    icon: '🤝', color: '#22c55e' },
  training:       { label: 'Training Class',   icon: '🎓', color: '#f59e0b' },
  meetup:         { label: 'Pet Meetup',       icon: '☕', color: '#3b82f6' },
  other:          { label: 'Event',            icon: '📅', color: '#6b7280' },
}

export default function EventDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const id       = params.id as string
  const supabase = createClient()

  const [event,   setEvent]   = useState<PawfectEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('*, rescue:rescues(id, name, logo, city)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        if (d) {
          setEvent({
            ...d,
            rescue:  Array.isArray(d.rescue) ? d.rescue[0] ?? null : d.rescue,
            profile: null,
          })
        }
        setLoading(false)
      })
  }, [id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">📅</span>
        <p className="text-white font-semibold">Event not found.</p>
        <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white underline">
          ← Go back
        </button>
      </div>
    )
  }

  const meta = EVENT_TYPE_LABELS[event.event_type] ?? EVENT_TYPE_LABELS.other

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="min-h-screen flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-[390px]">

        {/* Back */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-white font-semibold truncate">{event.title}</span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">

          {/* Image or banner */}
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-44 object-cover" />
          ) : (
            <div
              className="w-full h-32 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}44)` }}
            >
              <span className="text-6xl">{meta.icon}</span>
            </div>
          )}

          <div className="px-5 py-4">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon} {meta.label}
              </span>
              {event.status === 'cancelled' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                  Cancelled
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-4">{event.title}</h1>

            {/* Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-2.5">
                <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{fmtDate(event.starts_at)}</p>
                  <p className="text-xs text-gray-500">
                    {fmtTime(event.starts_at)}
                    {event.ends_at && ` – ${fmtTime(event.ends_at)}`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{event.location}</p>
                </div>
              )}
            </div>

            {event.description && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Hosted by */}
            {(event.rescue || event.profile) && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hosted by</p>
                {event.rescue ? (
                  <Link
                    href={`/rescues/${event.rescue_id}`}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg">
                      {event.rescue.logo ?? '🏠'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{event.rescue.name}</p>
                      {event.rescue.city && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={10} />
                          {event.rescue.city}
                        </p>
                      )}
                    </div>
                    <ExternalLink size={12} className="text-gray-400 ml-auto" />
                  </Link>
                ) : event.profile ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                      {event.profile.avatar ?? '🙂'}
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{event.profile.first_name}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Add to calendar (mailto/Google) */}
        <a
          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${new Date(event.starts_at).toISOString().replace(/[-:]/g,'').replace('.000','')}/${event.ends_at ? new Date(event.ends_at).toISOString().replace(/[-:]/g,'').replace('.000','') : new Date(new Date(event.starts_at).getTime()+3600000).toISOString().replace(/[-:]/g,'').replace('.000','')}&details=${encodeURIComponent(event.description??'')}&location=${encodeURIComponent(event.location??'')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold shadow-lg mb-6"
          style={{ backgroundColor: '#e05a4e' }}
        >
          <Calendar size={18} />
          Add to Calendar
        </a>

      </div>
    </div>
  )
}
