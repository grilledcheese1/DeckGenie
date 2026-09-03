'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { useProgress } from '@/hooks/useProgress'
import { useDailyStatsHistory } from '@/hooks/useDailyStatsHistory'
import { useRecentSessions } from '@/hooks/useRecentSessions'
import { liveStreak } from '@/lib/streak'
import { RoundsIcon, StreakIcon, TrophyIcon } from '@/components/ui/StatIcons'
import { CalendarIcon, ChevronDownIcon } from '@/components/progress/progressIcons'
import { ProgressStatCard } from '@/components/progress/ProgressStatCard'
import { PracticeActivityChart, type ActivityPoint } from '@/components/progress/PracticeActivityChart'
import { LearningCalendar } from '@/components/progress/LearningCalendar'
import { RecentSessionsCard } from '@/components/progress/RecentSessionsCard'
import { QuoteCard } from '@/components/dashboard/QuoteCard'

const RANGES = [
  { days: 7,  label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
]

/**
 * The `/progress` dashboard: headline stats from `useProgress()`, a
 * hand-rolled SVG activity chart + contribution calendar from
 * `daily_stats` (`useDailyStatsHistory`), a recent-attempts feed
 * (`useRecentSessions`), and the idiom-of-the-day card. No charting
 * library — the shapes here are simple enough to draw directly.
 */
export default function ProgressPage() {
  const [rangeDays, setRangeDays] = useState(14)

  const { progress } = useProgress()
  const { sessions, loading: sessionsLoading, error: sessionsError } = useRecentSessions(5)

  // One `daily_stats` fetch feeds both the chart and the calendar. A
  // 6-week window, aligned to end on this week's Sunday (so it chunks
  // cleanly into Mon–Sun rows) and starting 6 Mondays back — enough past
  // history for the 30-day chart too. The calendar only issues its own
  // query when the user pages back past this window.
  const dowMon = useMemo(() => (new Date().getUTCDay() + 6) % 7, [])
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const { days: stats, loading: historyLoading, error: historyError } =
    useDailyStatsHistory(42, -(6 - dowMon))

  const calendarDays = useMemo(() => stats.slice(-28), [stats])

  const rollingAccuracy = progress?.rolling_accuracy ?? 0
  const roundsCompleted = progress?.rounds_completed ?? 0
  const currentStreak   = liveStreak(progress?.streak_days, progress?.last_practiced_at)
  const longestStreak   = progress?.longest_streak_days ?? 0

  const accuracyHint =
    rollingAccuracy >= 90 ? 'Excellent consistency!'
    : rollingAccuracy >= 75 ? 'Solid and steady'
    : rollingAccuracy >= 1 ? 'Room to sharpen'
    : 'No grades yet'

  const points: ActivityPoint[] = useMemo(
    () => stats
      .filter(d => d.date <= todayISO)
      .slice(-rangeDays)
      .map(d => ({
        date: d.date,
        rounds: d.roundsDone,
        sentences: d.sentencesDone,
        accuracy: d.sentencesDone > 0 ? Math.round((d.sentencesCorrect / d.sentencesDone) * 100) : null,
      })),
    [stats, rangeDays, todayISO],
  )

  return (
    <AppShell>
      <div className="min-h-screen w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10 mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>Progress</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your learning journey at a glance.
            </p>
          </div>
          <div className="relative inline-flex flex-shrink-0 items-center">
            <span className="pointer-events-none absolute left-3" style={{ color: 'var(--text-tertiary)' }}>
              <CalendarIcon width={14} height={14} />
            </span>
            <select
              value={rangeDays}
              onChange={e => setRangeDays(Number(e.target.value))}
              aria-label="Time range"
              className="appearance-none rounded-xl py-2 pl-9 pr-9 text-sm font-medium transition-colors hover-border"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {RANGES.map(r => <option key={r.days} value={r.days}>{r.label}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3" style={{ color: 'var(--text-tertiary)' }}>
              <ChevronDownIcon width={13} height={13} />
            </span>
          </div>
        </div>

        {/* Stat row */}
        <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          <div className="sm:col-span-2 xl:col-span-2">
            <ProgressStatCard
              label="Rolling accuracy"
              value={`${rollingAccuracy}%`}
              hint={accuracyHint}
              hintTone={rollingAccuracy >= 75 ? 'accent' : 'muted'}
              ring={rollingAccuracy}
            />
          </div>
          <ProgressStatCard
            label="Rounds completed"
            value={String(roundsCompleted)}
            hint="Total rounds"
            icon={<RoundsIcon size={18} />}
          />
          <ProgressStatCard
            label="Current streak"
            value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
            hint={currentStreak >= 1 ? 'Keep it going!' : 'Start a new one'}
            hintTone={currentStreak >= 1 ? 'accent' : 'muted'}
            icon={<StreakIcon size={18} />}
          />
          <ProgressStatCard
            label="Longest streak"
            value={`${longestStreak} day${longestStreak === 1 ? '' : 's'}`}
            hint="Personal best"
            icon={<TrophyIcon size={18} />}
          />
        </div>

        {/* Activity + calendar */}
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PracticeActivityChart points={points} loading={historyLoading} error={historyError} />
          </div>
          <div className="lg:col-span-2">
            <LearningCalendar baseDays={calendarDays} loading={historyLoading} error={historyError} />
          </div>
        </div>

        {/* Recent sessions + quote */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RecentSessionsCard sessions={sessions} loading={sessionsLoading} error={sessionsError} />
          </div>
          <div className="lg:col-span-2">
            <QuoteCard variant="feature" />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
