'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VocabWord } from '@/types'

const RECENT_LIMIT = 3

/**
 * The 3 most-recently-unlocked vocab words for `RecentVocabCard`. A small
 * standalone query against `vocab_list` (same table `useVocabSheet` queries,
 * but scoped to `unlocked_at DESC limit 3` rather than the sheet's paginated
 * filter set) — deliberately not routed through `useVocabSheet`, whose state
 * (filters/pagination/`open()`) is owned by the vocab sheet flow and would
 * be the wrong shape for this glanceable card.
 *
 * Follows `useTodayStats`'s conventions: cancelled-guard, surfaced `error`,
 * no silent failures.
 */
export function useRecentVocab() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!ignore) {
            setWords([])
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await supabase
          .from('vocab_list')
          .select('*')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(RECENT_LIMIT)

        if (ignore) return

        if (queryError) {
          console.error('useRecentVocab: failed to load vocab_list:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        setWords(data ?? [])
        setError(null)
        setLoading(false)
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useRecentVocab: failed to load vocab_list:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [])

  return { words, loading, error }
}
