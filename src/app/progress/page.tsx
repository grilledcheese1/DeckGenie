'use client'

import { AppShell } from '@/components/shell/AppShell'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useProgress } from '@/hooks/useProgress'
import { useDailyStatsHistory, HISTORY_DAYS } from '@/hooks/useDailyStatsHistory'
import { RoundsIcon, AccuracyIcon, StreakIcon, TrophyIcon } from '@/components/ui/StatIcons'

/**
 * Surfaces `progress.rolling_accuracy` / `rounds_completed` / `streak_days`
 * / `longest_streak_days` — all already fetched by `useProgress()` — plus a
 * simple per-day history view built from `daily_stats` rows (via the new
 * `useDailyStatsHistory` hook) as hand-rolled CSS bars. No charting
 * library — the data (one number per day, 14 days) is simple enough that
 * plain `height: ${pct}%` divs are the right call.
 */
export default function ProgressPage() {
  const { progress, loading } = useProgress()
  const { days, loading: historyLoading, error: historyError } = useDailyStatsHistory()

  const roundsCompleted    = progress?.rounds_completed ?? 0
  const rollingAccuracy    = progress?.rolling_accuracy ?? 0
  const streakDays         = progress?.streak_days ?? 0
  const longestStreakDays  = progress?.longest_streak_days ?? 0

  const maxDone = Math.max(1, ...days.map(d => d.sentencesDone))

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Progress</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Your practice history and accuracy over time.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div
              className="w-5 h-5 rounded-full animate-spin"
              style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card padding="md">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                  aria-hidden="true"
                >
                  <RoundsIcon />
                </div>
                <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{roundsCompleted}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Rounds completed</p>
              </Card>

              <Card padding="md">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                  aria-hidden="true"
                >
                  <AccuracyIcon />
                </div>
                <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{rollingAccuracy}%</p>
                <p className="text-xs mt-2 mb-1" style={{ color: 'var(--text-tertiary)' }}>Rolling accuracy</p>
                <ProgressBar value={rollingAccuracy} max={100} aria-label="Rolling accuracy" />
              </Card>

              <Card padding="md">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                  aria-hidden="true"
                >
                  <StreakIcon />
                </div>
                <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  {streakDays} day{streakDays === 1 ? '' : 's'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Current streak</p>
              </Card>

              <Card padding="md">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2"
                  style={{ backgroundColor: 'var(--accent-subtle)' }}
                  aria-hidden="true"
                >
                  <TrophyIcon />
                </div>
                <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  {longestStreakDays} day{longestStreakDays === 1 ? '' : 's'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Longest streak</p>
              </Card>
            </div>

            {/* Per-day history bars */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Last 14 days</h2>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sentences practiced</p>
              </div>

              {historyError ? (
                <p className="text-xs" style={{ color: 'var(--error-text)' }} role="alert">
                  Could not load history: {historyError}
                </p>
              ) : (
                <div
                  className="flex items-end gap-1.5"
                  style={{ height: '96px', opacity: historyLoading ? 0.5 : 1 }}
                  role="list"
                  aria-label={`Sentences practiced per day over the last ${HISTORY_DAYS} days`}
                >
                  {days.map(day => {
                    const pct = day.sentencesDone > 0
                      ? Math.max(6, (day.sentencesDone / maxDone) * 100)
                      : 0
                    const accuracy = day.sentencesDone > 0
                      ? Math.round((day.sentencesCorrect / day.sentencesDone) * 100)
                      : null
                    const label = new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    const dayNum = day.date.slice(8, 10).replace(/^0/, '')
                    // `role="img"` is a leaf role — descendant content
                    // (including a per-bar `title`) is invisible to
                    // assistive tech. Using `role="list"` on the
                    // container + `role="listitem"` + `aria-label` here
                    // (mirroring `StreakCard.tsx`'s pattern) exposes each
                    // day's actual value instead of just the container's
                    // generic label.
                    const dayLabel = day.sentencesDone > 0
                      ? `${label}: ${day.sentencesDone} sentences, ${accuracy}% accuracy`
                      : `${label}: no practice`

                    return (
                      <div
                        key={day.date}
                        role="listitem"
                        aria-label={dayLabel}
                        className="flex-1 h-full flex flex-col items-center justify-end gap-1"
                        title={dayLabel}
                      >
                        <div
                          className="w-full rounded-t-md transition-all duration-300"
                          style={{
                            height: `${pct}%`,
                            minHeight: day.sentencesDone > 0 ? '4px' : '2px',
                            backgroundColor: day.sentencesDone > 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">
                          {dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
