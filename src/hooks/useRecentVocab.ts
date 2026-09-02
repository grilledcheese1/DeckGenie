'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readLocal, writeLocal } from '@/lib/localCache'
import type { VocabWord } from '@/types'

const RECENT_LIMIT = 3
const RECENT_VOCAB_KEY = 'hanzi_recent_vocab'

/**
 * The 3 most-recently-unlocked vocab words for `RecentVocabCard`. A small
 * standalone query against `vocab_list` (same table `useVocabSheet` queries,
 * but scoped to `unlocked_at DESC limit 3` rather than the sheet's paginated
 * filter set) — deliberately not routed through `useVocabSheet`, whose state
 * (filters/pagination/`open()`) is owned by the vocab sheet flow and would
 * be the wrong shape for this glanceable card.
 *
 * Hydrates from the previous session's cached words in an effect right
 * after mount — not synchronously in `useState`, which would make the
 * client's first render disagree with the server's cache-less render and
 * trigger a hydration-mismatch error — so a returning visit still renders
 * the list well before the network fetch below resolves, just one render
 * tick after hydration rather than synchronously with it. Same
 * session-persistence pattern as `useProgress`/`useTodayStats`/
 * `useWeeklyActivity`. Still refetches in the background and overwrites the
 * cache either way.
 *
 * Follows `useTodayStats`'s conventions: cancelled-guard, surfaced `error`,
 * no silent failures.
 */
export function useRecentVocab() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cached = readLocal<VocabWord[]>(RECENT_VOCAB_KEY)
    if (cached) {
      setWords(cached)
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

        const next = data ?? []
        setWords(next)
        setError(null)
        setLoading(false)
        writeLocal(RECENT_VOCAB_KEY, next)
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
