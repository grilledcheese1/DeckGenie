'use client'

import { Card } from '@/components/ui/Card'
import { useProgress } from '@/hooks/useProgress'
import { useWeeklyActivity } from '@/hooks/useWeeklyActivity'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * Surfaces `progress.streak_days` (already fetched by `useProgress`,
 * previously never rendered anywhere) plus a Mon-Sun dot tracker sourced
 * from `useWeeklyActivity`.
 */
export function StreakCard() {
  const { progress } = useProgress()
  const { days, loading, error } = useWeeklyActivity()

  const streak = progress?.streak_days ?? 0

  // `useWeeklyActivity` returns the last 7 calendar days in chronological
  // (oldest-first) order, which only starts on Monday if today happens to be
  // Sunday. Since a 7-day window contains exactly one of each weekday, sort
  // by `dayIndex` (0=Mon..6=Sun) to always render in the reference's fixed
  // M-T-W-T-F-S-S order regardless of what day it is today.
  const sortedDays = [...days].sort((a, b) => a.dayIndex - b.dayIndex)

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span aria-hidden="true" className="text-lg">🔥</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {streak} day{streak === 1 ? '' : 's'} streak
        </p>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {progress?.longest_streak_days ? `Best: ${progress.longest_streak_days} days` : 'Keep it going'}
      </p>

      <div className="flex items-center justify-between" role="list" aria-label="This week's activity">
        {DAY_LABELS.map((label, i) => {
          const day = sortedDays.find(d => d.dayIndex === i)
          const active = !loading && !error && (day?.active ?? false)
          return (
            <div key={i} role="listitem" className="flex flex-col items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{ backgroundColor: active ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                aria-hidden="true"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
