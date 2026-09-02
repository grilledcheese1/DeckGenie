'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SentenceAttempt, WrongAnswer } from '@/types'

const PAGE_SIZE = 20

/** Maps a DB `sentence_attempts` row onto the `WrongAnswer` shape
 *  `ReviewScreen`/`WrongAnswerCard` already render, so the `/review` page
 *  can reuse `WrongAnswerCard` directly without changing its prop contract. */
export function sentenceAttemptToWrongAnswer(a: SentenceAttempt): WrongAnswer {
  return {
    sentence_zh: a.sentence_zh,
    sentence_py: a.sentence_py,
    user_answer: a.user_answer,
    correct_answer: a.correct_answer,
    vocab_used: a.vocab_used,
  }
}

// Plain (non-setState-calling) query helper shared by the initial load and
// `loadMore`, so the actual Supabase query isn't duplicated between them.
async function queryWrongAttempts(userId: string, offset: number) {
  const supabase = createClient()
  return supabase
    .from('sentence_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('correct', false)
    .order('attempted_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
}

/**
 * Paginated `sentence_attempts` history (incorrect attempts only) for the
 * `/review` page — real DB history, not in-memory session data. Queries
 * `user_id` + `correct = false`, ordered `attempted_at desc`; RLS already
 * permits this via the `sentence_attempts_select` policy, no migration
 * needed.
 *
 * Pagination follows `useVocabSheet`'s offset/`hasMore`/`loadMore` shape.
 * The initial load follows `useTodayStats`/`useWeeklyActivity`/
 * `useRecentVocab`'s convention exactly: a cancelled-guarded `load()`
 * defined and invoked directly inside the mount effect (rather than a
 * hoisted `useCallback` invoked via the dependency array, which is the
 * pattern that trips `react-hooks/set-state-in-effect` elsewhere in this
 * codebase, e.g. `useProgress.ts`). `loadMore` surfaces the same error
 * state and never fails silently.
 */
export function useReviewHistory() {
  const [attempts, setAttempts] = useState<SentenceAttempt[]>([])
  const [loading, setLoading]   = useState(true)
  const [hasMore, setHasMore]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const offsetRef               = useRef(0)
  // Structural concurrency guard for `loadMore` — the `loading` state
  // value read inside the callback closure is timing-dependent (two
  // `loadMore()` calls in the same render flush can both read
  // `loading === false` before either's `setLoading(true)` commits,
  // fetching the same offset twice and appending duplicate rows). This
  // ref is set/cleared synchronously, independent of React's render
  // cycle, so it's airtight against that race.
  const inFlightRef             = useRef(false)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!ignore) {
            setAttempts([])
            setHasMore(false)
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data, error: queryError } = await queryWrongAttempts(user.id, 0)

        if (ignore) return

        if (queryError) {
          console.error('useReviewHistory: failed to load sentence_attempts:', queryError.message)
          setError(queryError.message)
          setLoading(false)
          return
        }

        const rows = data ?? []
        setAttempts(rows)
        offsetRef.current = rows.length
        setHasMore(rows.length === PAGE_SIZE)
        setError(null)
        setLoading(false)
      } catch (e) {
        if (ignore) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('useReviewHistory: failed to load sentence_attempts:', message)
        setError(message)
        setLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [])

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || loading || !hasMore) return
    inFlightRef.current = true
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasMore(false)
        setLoading(false)
        return
      }

      const offset = offsetRef.current
      const { data, error: queryError } = await queryWrongAttempts(user.id, offset)

      if (queryError) {
        console.error('useReviewHistory: failed to load more sentence_attempts:', queryError.message)
        setError(queryError.message)
        // A failed query becomes a terminal state (surfaced via `error`)
        // rather than leaving `hasMore: true` — otherwise `/review`'s
        // scroll-proximity handler re-fires this same failing query on
        // every subsequent scroll tick, retrying forever.
        setHasMore(false)
        setLoading(false)
        return
      }

      const rows = data ?? []
      setAttempts(prev => [...prev, ...rows])
      offsetRef.current = offset + rows.length
      setHasMore(rows.length === PAGE_SIZE)
      setError(null)
      setLoading(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      console.error('useReviewHistory: failed to load more sentence_attempts:', message)
      setError(message)
      setHasMore(false)
      setLoading(false)
    } finally {
      inFlightRef.current = false
    }
  }, [loading, hasMore])

  return { attempts, loading, hasMore, error, loadMore }
}
