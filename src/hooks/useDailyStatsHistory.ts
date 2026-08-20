'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DailyStatPoint {
  /** `YYYY-MM-DD`. */
  date: string
  sentencesDone: number
  sentencesCorrect: number
}

const HISTORY_DAYS = 14

/**
 * Last 14 calendar days of `daily_stats` rows for the `/progress` page's
 * hand-rolled bar chart. Same RLS-permitted direct-query pattern as
 * `useWeeklyActivity` (7 days, for the sidebar's dot tracker) — this is
 * the same shape over a longer window, since Progress wants more than a
 * week of history but is still deliberately a lightweight view, not a
 * full analytics dashboard.
 *
 * Follows `useTodayStats`/`useWeeklyActivity`'s conventions: cancelled-
 * guard, surfaced `error`, no silent failures.
 */
export function useDailyStatsHistory() {
  const [days, setDays] = useState<DailyStatPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const today = new Date()
        const dates: string[] = []
        for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          dates.push(d.toISOString().slice(0, 10))
        }

        if (!user) {
          if (!ignore) {
            setDays(dates.map(date => ({ date, sentencesDone: 0, sentencesCorrect: 0 })))
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await supabase
          .from('daily_stats')
          .select('date, sentences_done, sentences_correct')
          .eq('user_id', user.id)
          .gte('date', dates[0])
          .lte('date', dates[dates.length - 1])

        if (ignore) return

        if (queryError) {
          console.error('useDailyStatsHistory: failed to load daily_stats:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        const byDate = new Map<string, { sentencesDone: number; sentencesCorrect: number }>()
        for (const row of data ?? []) {
          byDate.set(row.date, {
            sentencesDone: row.sentences_done ?? 0,
            sentencesCorrect: row.sentences_correct ?? 0,
          })
        }

        setDays(dates.map(date => ({
          date,
          sentencesDone: byDate.get(date)?.sentencesDone ?? 0,
          sentencesCorrect: byDate.get(date)?.sentencesCorrect ?? 0,
        })))
        setError(null)
        setLoading(false)
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useDailyStatsHistory: failed to load daily_stats:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [])

  return { days, loading, error }
}
