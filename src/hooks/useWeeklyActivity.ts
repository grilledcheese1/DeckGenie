'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DayActivity {
  /** 0 = Monday .. 6 = Sunday, matching the reference's M-T-W-T-F-S-S order. */
  dayIndex: number
  /** `YYYY-MM-DD`. */
  date: string
  active: boolean
}

// JS `Date#getDay()` is 0 = Sunday .. 6 = Saturday. The card wants
// Monday-first (M T W T F S S), so remap Sunday to the end of the week.
function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

/**
 * Last 7 calendar days' activity for `StreakCard`'s weekly dot tracker.
 * Queries `public.daily_stats` directly (same RLS-permitted pattern as
 * `useTodayStats`) rather than going through `useProgress`, since this needs
 * per-day rows, not the aggregate `progress` row.
 *
 * Follows `useTodayStats`'s conventions: cancelled-guard, surfaced `error`,
 * no silent failures.
 */
export function useWeeklyActivity() {
  const [days, setDays] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Build the last 7 calendar days (today inclusive), oldest first.
        const today = new Date()
        const dates: string[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          dates.push(d.toISOString().slice(0, 10))
        }

        if (!user) {
          if (!ignore) {
            setDays(dates.map(date => ({
              dayIndex: mondayFirstIndex(new Date(date + 'T00:00:00').getDay()),
              date,
              active: false,
            })))
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await supabase
          .from('daily_stats')
          .select('date, sentences_done')
          .eq('user_id', user.id)
          .gte('date', dates[0])
          .lte('date', dates[dates.length - 1])

        if (ignore) return

        if (queryError) {
          console.error('useWeeklyActivity: failed to load daily_stats:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        const activeByDate = new Map<string, boolean>()
        for (const row of data ?? []) {
          activeByDate.set(row.date, (row.sentences_done ?? 0) > 0)
        }

        setDays(dates.map(date => ({
          dayIndex: mondayFirstIndex(new Date(date + 'T00:00:00').getDay()),
          date,
          active: activeByDate.get(date) ?? false,
        })))
        setError(null)
        setLoading(false)
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useWeeklyActivity: failed to load daily_stats:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [])

  return { days, loading, error }
}
