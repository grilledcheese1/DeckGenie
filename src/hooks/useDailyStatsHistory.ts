'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DailyStatPoint {
  /** `YYYY-MM-DD`. */
  date: string
  sentencesDone: number
  sentencesCorrect: number
  roundsDone: number
}

/** Default window. Callers can pass their own (the `/progress` range
 *  selector uses 7 / 14 / 30). */
export const HISTORY_DAYS = 14

/**
 * `daily_stats` rows for the `/progress` page's activity chart and
 * contribution calendar. Same RLS-permitted direct-query pattern as
 * `useWeeklyActivity`, over an arbitrary window.
 *
 * @param days           number of calendar days to return (oldest-first)
 * @param endOffsetDays  shift the window this many days into the past
 *                       (0 = window ends today; negative = ends in the
 *                       future, e.g. this week's Sunday for the calendar)
 * @param enabled        when false the hook stays idle (no query, no
 *                       auth call) and returns an empty window — used by
 *                       the calendar, which only needs its own fetch when
 *                       the user pages back past the window the page
 *                       already loaded.
 *
 * Reads the user id from the cached session (`getSession`) rather than
 * re-validating it over the network (`getUser`) on every mount — the
 * query is RLS-scoped to `auth.uid()` server-side regardless, so the
 * client only needs the id to build it. Follows
 * `useTodayStats`/`useWeeklyActivity`'s cancelled-guard / surfaced-error
 * conventions.
 */
export function useDailyStatsHistory(days: number = HISTORY_DAYS, endOffsetDays: number = 0, enabled: boolean = true) {
  const [rows, setRows] = useState<DailyStatPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Idle when disabled — no query, no auth call, no state writes. The
    // returned values below are masked to the empty window instead.
    if (!enabled) return

    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null

        // All-UTC arithmetic so the dates line up with `toISOString()`
        // (UTC) and with the `getUTCDay()`-based Monday alignment the
        // calendar does — mixing local `getDate()` with UTC output is an
        // off-by-one near midnight in non-UTC zones.
        const today = new Date()
        const dates: string[] = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setUTCDate(d.getUTCDate() - i - endOffsetDays)
          dates.push(d.toISOString().slice(0, 10))
        }

        if (!user) {
          if (!ignore) {
            setRows(dates.map(date => ({ date, sentencesDone: 0, sentencesCorrect: 0, roundsDone: 0 })))
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await supabase
          .from('daily_stats')
          .select('date, sentences_done, sentences_correct, rounds_done')
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

        const byDate = new Map<string, Omit<DailyStatPoint, 'date'>>()
        for (const row of data ?? []) {
          byDate.set(row.date, {
            sentencesDone: row.sentences_done ?? 0,
            sentencesCorrect: row.sentences_correct ?? 0,
            roundsDone: row.rounds_done ?? 0,
          })
        }

        setRows(dates.map(date => ({
          date,
          sentencesDone: byDate.get(date)?.sentencesDone ?? 0,
          sentencesCorrect: byDate.get(date)?.sentencesCorrect ?? 0,
          roundsDone: byDate.get(date)?.roundsDone ?? 0,
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
  }, [days, endOffsetDays, enabled])

  return enabled
    ? { days: rows, loading, error }
    : { days: [] as DailyStatPoint[], loading: false, error: null }
}
