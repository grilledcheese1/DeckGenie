'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Just today's practice count, for the Sidebar's Daily Goal mini-card.
 *
 * Scoped deliberately to a single day — a 7-day/weekly view is a different,
 * later task's job (YAGNI). Queries `public.daily_stats` directly (RLS
 * policy `daily_stats_select` already permits `auth.uid() = user_id`
 * selects) rather than going through `useProgress`, since `progress` only
 * tracks the current *round*, not the calendar day.
 */
export function useTodayStats() {
  const [sentencesDone, setSentencesDone] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) { setSentencesDone(0); setLoading(false) }
          return
        }

        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

        const { data } = await supabase
          .from('daily_stats')
          .select('sentences_done')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        if (!cancelled) {
          setSentencesDone(data?.sentences_done ?? 0)
          setLoading(false)
        }
      } catch {
        if (!cancelled) { setSentencesDone(0); setLoading(false) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { sentencesDone, loading }
}
