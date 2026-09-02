'use client'

import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useProgress } from '@/hooks/useProgress'
import { useTodayStats } from '@/hooks/useTodayStats'

/**
 * `ProgressBar` toward today's goal. Goal = `settings.sentences_per_round`,
 * actual = today's `sentences_done` — reuses `useTodayStats` as-is (already
 * built in a prior task, don't rebuild it).
 */
export function DailyGoalCard() {
  const { settings } = useProgress()
  const { sentencesDone, loading, error } = useTodayStats()

  const goal = settings?.sentences_per_round ?? 10

  // An RLS denial / network failure should never silently render as "0
  // sentences today" — same convention as Sidebar's daily-goal mini-card.
  const display = error ? '—' : loading ? '…' : sentencesDone
  const value = error || loading ? 0 : sentencesDone

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Daily goal</h3>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {display} / {goal}
        </p>
      </div>
      <ProgressBar value={value} max={goal} aria-label="Today's sentences toward daily goal" />
    </Card>
  )
}
