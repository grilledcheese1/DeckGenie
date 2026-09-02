'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { readLocal, writeLocal } from '@/lib/localCache'

const TODAY_STATS_KEY = 'hanzi_today_stats'

interface CachedTodayStats {
  date: string
  sentencesDone: number
  roundsDone: number
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// Cache is date-scoped — a cached count from yesterday would be a wrong
// "today" count, not just a stale one, so it's only trusted for today's date.
function readCachedToday(): CachedTodayStats | null {
  const cached = readLocal<CachedTodayStats>(TODAY_STATS_KEY)
  return cached && cached.date === todayDate() ? cached : null
}

/**
 * Today's practice counts (sentences + rounds), for the Sidebar's Daily
 * Goal mini-card and the dashboard's "Rounds / Today" stat.
 *
 * Scoped deliberately to a single day — a 7-day/weekly view is a different,
 * later task's job (YAGNI). Queries `public.daily_stats` directly (RLS
 * policy `daily_stats_select` already permits `auth.uid() = user_id`
 * selects) rather than going through `useProgress`, since `progress` only
 * tracks the current *round*, not the calendar day.
 *
 * Hydrates from today's cached counts (if any) in an effect right after
 * mount — not synchronously in `useState`, which would make the client's
 * first render disagree with the server's cache-less render and trigger a
 * hydration-mismatch error — so a returning visit still renders real
 * numbers well before the network fetch below resolves, just one render
 * tick after hydration rather than synchronously with it. Same
 * session-persistence pattern as `useProgress`/`useWeeklyActivity`/
 * `useRecentVocab`. Still refetches in the background and overwrites the
 * cache either way.
 *
 * `Sidebar` lives in an always-mounted shell, so a mount-only fetch would
 * go stale the moment a practice round updates `daily_stats` elsewhere.
 * Refetches on every route change (a reasonable proxy for "something might
 * have updated" until a more precise trigger exists — e.g. finishing a
 * round navigates back to /dashboard) via `pathname` in the effect's
 * dependency array, and exposes `refresh` — bumping `refreshIndex`, the
 * React-docs-recommended way to force an effect-driven fetch to re-run
 * (https://react.dev/learn/you-might-not-need-an-effect#fetching-data) — so
 * a later phase's practice-completion flow can trigger a refetch directly.
 */
export function useTodayStats() {
  const pathname = usePathname()
  const [sentencesDone, setSentencesDone] = useState(0)
  const [roundsDone, setRoundsDone] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    const cached = readCachedToday()
    if (cached) {
      setSentencesDone(cached.sentencesDone)
      setRoundsDone(cached.roundsDone)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!ignore) {
            setSentencesDone(0)
            setRoundsDone(0)
            setError(null)
            setLoading(false)
          }
          return
        }

        const today = todayDate()

        const { data, error: queryError } = await supabase
          .from('daily_stats')
          .select('sentences_done, rounds_done')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        if (ignore) return

        if (queryError) {
          console.error('useTodayStats: failed to load daily_stats:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        const sentences = data?.sentences_done ?? 0
        const rounds = data?.rounds_done ?? 0
        setSentencesDone(sentences)
        setRoundsDone(rounds)
        setError(null)
        setLoading(false)
        writeLocal(TODAY_STATS_KEY, { date: today, sentencesDone: sentences, roundsDone: rounds })
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useTodayStats: failed to load daily_stats:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [pathname, refreshIndex])

  const refresh = useCallback(() => setRefreshIndex(i => i + 1), [])

  return { sentencesDone, roundsDone, loading, error, refresh }
}
