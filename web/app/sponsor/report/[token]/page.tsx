'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ctr } from '@/lib/sponsors'

// Private sponsor report — the link the site owner sends a sponsor. Anyone
// holding the link sees that one ad's numbers (get_sponsor_report RPC,
// migration 016); nothing about visitors is shown or stored.

type Day = { day: string; impressions: number; clicks: number }
type Report = {
  title: string
  sponsor_name: string | null
  placement: string
  target_city: string | null
  target_radius_mi: number | null
  active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  impressions: number
  clicks: number
  days: Day[]
}

const PLACEMENT_LABEL: Record<string, string> = {
  match:     '"It\'s a match!" screen',
  detail:    'Pet details',
  shop:      'Shop',
  community: 'Community',
  saved:     'Saved pets',
}

const RANGE_DAYS = 30

function lastNDays(n: number, today = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function SponsorReportPage() {
  const { token } = useParams<{ token: string }>()
  const [supabase] = useState(createClient)
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState]   = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [hover, setHover]   = useState<number | null>(null)

  // A malformed link can't match any report — no need to ask the server
  const validToken = /^[0-9a-f-]{36}$/i.test(token ?? '')

  useEffect(() => {
    if (!validToken) return
    supabase.rpc('get_sponsor_report', { token }).then(({ data, error }) => {
      if (error) { setState('error'); return }
      if (!data) { setState('missing'); return }
      setReport(data as Report)
      setState('ok')
    })
  }, [supabase, token, validToken])

  // Fill gaps so every one of the last 30 days has a bar (zero if no views)
  const series = useMemo(() => {
    const byDay = new Map((report?.days ?? []).map(d => [d.day, d]))
    return lastNDays(RANGE_DAYS).map(day => byDay.get(day) ?? { day, impressions: 0, clicks: 0 })
  }, [report])
  const rangeViews  = series.reduce((s, d) => s + d.impressions, 0)
  const rangeClicks = series.reduce((s, d) => s + d.clicks, 0)
  const max = Math.max(1, ...series.map(d => d.impressions))

  if (state === 'loading' && validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (!validToken || state !== 'ok' || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-5xl">📊</span>
        <p className="text-gray-900 font-semibold">
          {state === 'error' ? 'This report isn’t available right now.' : 'Report not found.'}
        </p>
        <p className="text-gray-800 text-sm max-w-[300px]">
          {state === 'error'
            ? 'Please try again in a few minutes.'
            : 'Check that you opened the full link from your Pawfect Match sponsorship email.'}
        </p>
      </div>
    )
  }

  const where = report.target_city && report.target_radius_mi
    ? `Adopters within ${report.target_radius_mi} mi of ${report.target_city}`
    : 'Adopters nationwide'

  return (
    <div className="min-h-screen flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-[560px] space-y-3">

        <header className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sponsor report · Pawfect Match</p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{report.sponsor_name || report.title}</h1>
          {report.sponsor_name && <p className="text-sm text-gray-600">“{report.title}”</p>}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-gray-500">Shown on</dt>
            <dd className="text-gray-800">{PLACEMENT_LABEL[report.placement] ?? report.placement}</dd>
            <dt className="text-gray-500">Audience</dt>
            <dd className="text-gray-800">{where}</dd>
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-800">
              {report.active ? 'Running' : 'Paused'}
              {report.ends_at && <> · ends {fmtDate(report.ends_at)}</>}
            </dd>
          </dl>
        </header>

        {/* Headline numbers — last 30 days */}
        <section aria-label={`Last ${RANGE_DAYS} days`} className="grid grid-cols-3 gap-2">
          {[
            { label: 'Views',      value: rangeViews.toLocaleString() },
            { label: 'Clicks',     value: rangeClicks.toLocaleString() },
            { label: 'Click rate', value: ctr(rangeViews, rangeClicks) },
          ].map(t => (
            <div key={t.label} className="bg-white rounded-2xl shadow-sm px-3 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{t.value}</p>
              <p className="text-xs text-gray-500">{t.label} · last {RANGE_DAYS} days</p>
            </div>
          ))}
        </section>

        {/* Daily views — single series bar chart with per-bar hover */}
        <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900">Daily views</h2>
          <p className="text-xs text-gray-500 mb-3 h-4" aria-live="polite">
            {hover != null
              ? `${fmtDay(series[hover].day)}: ${series[hover].impressions.toLocaleString()} views · ${series[hover].clicks.toLocaleString()} clicks`
              : 'Hover or tap a bar for that day'}
          </p>
          <div className="relative h-32 flex items-end gap-[2px] border-b border-gray-200" role="img"
               aria-label={`Daily views over the last ${RANGE_DAYS} days; the busiest day had ${max.toLocaleString()} views`}>
            {series.map((d, i) => (
              <button
                key={d.day}
                type="button"
                className="flex-1 h-full flex items-end focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e05a4e]"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(i)}
                aria-label={`${fmtDay(d.day)}: ${d.impressions} views, ${d.clicks} clicks`}
              >
                <span
                  className="block w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: d.impressions ? `${Math.max(2, (d.impressions / max) * 100)}%` : 0,
                    backgroundColor: '#e05a4e',
                    opacity: hover == null || hover === i ? 1 : 0.45,
                  }}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 mt-1">
            <span>{fmtDay(series[0].day)}</span>
            <span>{fmtDay(series[series.length - 1].day)}</span>
          </div>
        </section>

        {/* Table view (accessible + exact numbers) */}
        <details className="bg-white rounded-2xl shadow-sm px-5 py-3">
          <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Day-by-day numbers</summary>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-1 font-medium">Day</th>
                  <th className="py-1 font-medium text-right">Views</th>
                  <th className="py-1 font-medium text-right">Clicks</th>
                  <th className="py-1 font-medium text-right">Click rate</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map(d => (
                  <tr key={d.day} className="border-t border-gray-100 text-gray-800">
                    <td className="py-1">{fmtDay(d.day)}</td>
                    <td className="py-1 text-right">{d.impressions.toLocaleString()}</td>
                    <td className="py-1 text-right">{d.clicks.toLocaleString()}</td>
                    <td className="py-1 text-right">{ctr(d.impressions, d.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="text-xs text-gray-800 text-center px-4 pb-2">
          All time since {fmtDate(report.created_at)}: {report.impressions.toLocaleString()} views ·{' '}
          {report.clicks.toLocaleString()} clicks. A view is counted each time your ad is shown;
          days are in UTC. No personal data about visitors is collected.
        </p>
      </div>
    </div>
  )
}
