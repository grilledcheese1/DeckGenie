'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readLocal, writeLocal } from '@/lib/localCache'

export interface DayActivity {
  /** 0 = Monday .. 6 = Sunday, matching the reference's M-T-W-T-F-S-S order. */
  dayIndex: number
  /** `YYYY-MM-DD`. */
  date: string
  active: boolean
}

const WEEKLY_ACTIVITY_KEY = 'hanzi_weekly_activity'

interface CachedWeeklyActivity {
  /** Today's date when this was cached — the 7-day window shifts daily. */
  asOf: string
  days: DayActivity[]
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// Cache is date-scoped — the 7-day window is only valid for the day it was
// computed on, so a cache from yesterday would show the wrong week.
function readCachedWeek(): DayActivity[] | null {
  const cached = readLocal<CachedWeeklyActivity>(WEEKLY_ACTIVITY_KEY)
  return cached && cached.asOf === todayDate() ? cached.days : null
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
 * Hydrates from today's cached week (if any) in an effect right after
 * mount — not synchronously in `useState`, which would make the client's
 * first render disagree with the server's cache-less render (dimmed dots
 * vs. real ones) and trigger a hydration-mismatch error — so a returning
 * visit still renders real dots well before the network fetch below
 * resolves, just one render tick after hydration rather than synchronously
 * with it. Same session-persistence pattern as
 * `useProgress`/`useTodayStats`/`useRecentVocab`. Still refetches in the
 * background and overwrites the cache either way.
 *
 * Follows `useTodayStats`'s conventions: cancelled-guard, surfaced `error`,
 * no silent failures.
 */
export function useWeeklyActivity() {
  const [days, setDays] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cached = readCachedWeek()
    if (cached) {
      setDays(cached)
      setLoading(false)
    }
  }, [])

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

        const nextDays = dates.map(date => ({
          dayIndex: mondayFirstIndex(new Date(date + 'T00:00:00').getDay()),
          date,
          active: activeByDate.get(date) ?? false,
        }))
        setDays(nextDays)
        setError(null)
        setLoading(false)
        writeLocal(WEEKLY_ACTIVITY_KEY, { asOf: todayDate(), days: nextDays })
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
