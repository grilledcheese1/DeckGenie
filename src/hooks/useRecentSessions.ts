'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SentenceAttempt } from '@/types'

/**
 * The most recent graded `sentence_attempts` (all outcomes, not just
 * wrong ones — that's `useReviewHistory`) for the `/progress` page's
 * "Recent sessions" list. Newest first, capped small.
 *
 * Same cancelled-guard / surfaced-error / no-silent-failure convention as
 * `useReviewHistory`, minus the pagination. Reads the user id from the
 * cached session (`getSession`) rather than re-validating over the network
 * (`getUser`) — the query is RLS-scoped to `auth.uid()` server-side, so
 * the client only needs the id to build it.
 */
export function useRecentSessions(limit: number = 5) {
  const [sessions, setSessions] = useState<SentenceAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null

        if (!user) {
          if (!ignore) {
            setSessions([])
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await supabase
          .from('sentence_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false })
          .range(0, limit - 1)

        if (ignore) return

        if (queryError) {
          console.error('useRecentSessions: failed to load sentence_attempts:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        setSessions(data ?? [])
        setError(null)
        setLoading(false)
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useRecentSessions: failed to load sentence_attempts:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [limit])

  return { sessions, loading, error }
}
