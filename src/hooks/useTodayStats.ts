'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Just today's practice count, for the Sidebar's Daily Goal mini-card.
 *
 * Scoped deliberately to a single day — a 7-day/weekly view is a different,
 * later task's job (YAGNI). Queries `public.daily_stats` directly (RLS
 * policy `daily_stats_select` already permits `auth.uid() = user_id`
 * selects) rather than going through `useProgress`, since `progress` only
 * tracks the current *round*, not the calendar day.
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!ignore) {
            setSentencesDone(0)
            setError(null)
            setLoading(false)
          }
          return
        }

        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

        const { data, error: queryError } = await supabase
          .from('daily_stats')
          .select('sentences_done')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        if (ignore) return

        if (queryError) {
          // Surfaced via `error` (not swallowed) — an RLS denial or network
          // failure should never silently render as "0 sentences today".
          console.error('useTodayStats: failed to load daily_stats:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        setSentencesDone(data?.sentences_done ?? 0)
        setError(null)
        setLoading(false)
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

  return { sentencesDone, loading, error, refresh }
}
