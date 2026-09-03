'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useDailyStatsHistory, type DailyStatPoint } from '@/hooks/useDailyStatsHistory'
import { InfoIcon, ChevronLeftIcon, ChevronRightIcon } from './progressIcons'

const WEEKS = 4
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** rounds/day → 0..3 intensity bucket, matching the legend. */
function level(rounds: number): 0 | 1 | 2 | 3 {
  if (rounds <= 0) return 0
  if (rounds <= 2) return 1
  if (rounds <= 5) return 2
  return 3
}

const LEVEL_STYLE: Record<0 | 1 | 2 | 3, React.CSSProperties> = {
  0: { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' },
  1: { backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' },
  2: { backgroundColor: 'color-mix(in srgb, var(--accent) 60%, transparent)' },
  3: { backgroundColor: 'var(--accent)' },
}

const LEGEND: { label: string; lvl: 0 | 1 | 2 | 3 }[] = [
  { label: 'No activity', lvl: 0 },
  { label: '1–2 rounds', lvl: 1 },
  { label: '3–5 rounds', lvl: 2 },
  { label: '6+ rounds', lvl: 3 },
]

interface Props {
  /** The current 4 weeks (28 entries, Mon-aligned) — already fetched by
   *  the page so the offset-0 view costs no extra query. */
  baseDays: DailyStatPoint[]
  loading: boolean
  error: string | null
}

export function LearningCalendar({ baseDays, loading: baseLoading, error: baseError }: Props) {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current 4 weeks, +1 = 4 weeks earlier
  const paged = weekOffset > 0

  // Days from today back to the end (Sunday) of the currently-shown block.
  // Negative when the block ends this week (Sunday is still in the future).
  const dowMon = useMemo(() => {
    const t = new Date()
    return (t.getUTCDay() + 6) % 7 // 0 = Monday
  }, [])
  const endOffsetDays = -(6 - dowMon) + weekOffset * WEEKS * 7

  // Only hits the network when the user pages back past `baseDays`.
  const pagedResult = useDailyStatsHistory(WEEKS * 7, endOffsetDays, paged)
  const days    = paged ? pagedResult.days : baseDays
  const loading = paged ? pagedResult.loading : baseLoading
  const error   = paged ? pagedResult.error : baseError

  const rows = useMemo(() => {
    const out: (typeof days)[] = []
    for (let w = 0; w < WEEKS; w++) out.push(days.slice(w * 7, w * 7 + 7))
    return out
  }, [days])

  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <Card padding="lg" className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Learning calendar</h2>
          <span style={{ color: 'var(--text-tertiary)' }} title="Rounds completed each day">
            <InfoIcon width={13} height={13} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset(o => o + 1)}
            aria-label="Earlier weeks"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover-bg"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
            aria-label="Later weeks"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover-bg disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="py-6 text-xs" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load calendar: {error}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[260px] max-w-[440px] grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1"
              style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              <span />
              {DOW.map(d => (
                <span key={d} className="pb-0.5 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{d}</span>
              ))}

              {rows.map((week, wi) => (
                <div key={wi} className="contents">
                  <span className="flex items-center pr-2 text-[10px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                    {week[0] ? fmt(week[0].date) : ''}
                  </span>
                  {week.map(day => {
                    const isFuture = new Date(day.date + 'T00:00:00Z').getTime() > Date.now()
                    const lvl = level(day.roundsDone)
                    return (
                      <div
                        key={day.date}
                        className="aspect-square w-full rounded-[4px]"
                        style={isFuture ? { backgroundColor: 'transparent' } : LEVEL_STYLE[lvl]}
                        title={isFuture ? '' : `${fmt(day.date)}: ${day.roundsDone} round${day.roundsDone === 1 ? '' : 's'}`}
                        aria-label={isFuture ? undefined : `${fmt(day.date)}: ${day.roundsDone} rounds`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
            {LEGEND.map(({ label, lvl }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px]" style={LEVEL_STYLE[lvl]} aria-hidden="true" />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
