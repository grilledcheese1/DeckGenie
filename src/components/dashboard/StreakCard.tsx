'use client'

import { Card } from '@/components/ui/Card'
import { useProgress } from '@/hooks/useProgress'
import { useWeeklyActivity } from '@/hooks/useWeeklyActivity'
import { liveStreak } from '@/lib/streak'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Surfaces `progress.streak_days` (already fetched by `useProgress`,
 * previously never rendered anywhere) plus a Mon-Sun dot tracker sourced
 * from `useWeeklyActivity`.
 */
export function StreakCard() {
  const { progress } = useProgress()
  const { days, loading, error } = useWeeklyActivity()

  const streak = liveStreak(progress?.streak_days, progress?.last_practiced_at)

  // `useWeeklyActivity` returns the last 7 calendar days in chronological
  // (oldest-first) order, which only starts on Monday if today happens to be
  // Sunday. Since a 7-day window contains exactly one of each weekday, sort
  // by `dayIndex` (0=Mon..6=Sun) to always render in the reference's fixed
  // M-T-W-T-F-S-S order regardless of what day it is today.
  const sortedDays = [...days].sort((a, b) => a.dayIndex - b.dayIndex)

  // Loading/error must never be conflated with "no activity" — that would
  // render a confident, false "zero days practiced" week (exactly the
  // anti-pattern `useTodayStats`'s doc comment warns against). Show a
  // neutral/skeleton dot instead, same convention `DailyGoalCard`/`Sidebar`
  // already use for their daily-goal figures.
  const unknown = loading || !!error

  return (
    <Card padding="md">
      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {streak} day{streak === 1 ? '' : 's'} streak
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {progress?.longest_streak_days ? `Best: ${progress.longest_streak_days} days` : 'Keep it going'}
      </p>

      <div className="flex items-center justify-between" role="list" aria-label="This week's activity">
        {DAY_LABELS.map((label, i) => {
          const day = sortedDays.find(d => d.dayIndex === i)
          const active = !unknown && (day?.active ?? false)
          const dayName = DAY_NAMES[i]
          // Color alone can't convey state to screen-reader users (WCAG
          // 1.4.1) — the practiced/not-practiced/unknown state goes on the
          // `listitem` via `aria-label`, with the full day name since the
          // bare letter labels are ambiguous (two T's, two S's).
          const stateLabel = unknown ? 'status unknown' : active ? 'practiced' : 'not practiced'
          return (
            <div
              key={i}
              role="listitem"
              aria-label={`${dayName}: ${stateLabel}`}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-tertiary)',
                  opacity: unknown ? 0.4 : 1,
                }}
                aria-hidden="true"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
