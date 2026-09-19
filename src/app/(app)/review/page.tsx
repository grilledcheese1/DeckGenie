'use client'

import { useCallback, useEffect, useRef } from 'react'
import { WrongAnswerCard } from '@/components/practice/WrongAnswerCard'
import { useReviewHistory, sentenceAttemptToWrongAnswer } from '@/hooks/useReviewHistory'

/**
 * Standalone review-history page — real DB history of past incorrect
 * attempts (`sentence_attempts`), not the in-session `ReviewScreen`
 * overlay `practice/page.tsx` shows right after a round. Renders the same
 * `WrongAnswerCard` used there, mapped from `SentenceAttempt` via
 * `sentenceAttemptToWrongAnswer`, but laid out as normal page content
 * inside the shared `AppShell` (via the `(app)` layout) rather than
 * `ReviewScreen`'s fixed-overlay GSAP shell (that shell is overlay-specific
 * and wrong for a page next to the sidebar).
 *
 * Infinite-scroll-on-proximity, matching `VocabSheet`/`VocabBrowser`'s
 * existing `onScroll` pattern rather than a "Load more" button, for
 * consistency with the rest of the app.
 */
export default function ReviewPage() {
  const { attempts, loading, hasMore, error, loadMore } = useReviewHistory()
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore()
  }, [loadMore])

  // Scroll-proximity loading (above) never fires if a page of results
  // doesn't overflow the container in the first place — a large viewport
  // or short card content can leave `hasMore: true` with no scrollbar to
  // ever trigger `handleScroll`, silently stalling pagination. After each
  // load, top up until either the container actually scrolls or there's
  // nothing left to fetch. `loadMore` already no-ops while a request is
  // in flight or `hasMore` is false, so calling it here is safe even if
  // this fires before the previous call has settled.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return
    if (el.scrollHeight <= el.clientHeight) loadMore()
  }, [attempts, loading, hasMore, loadMore])

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto flex flex-col">
      <div className="mb-4">
        <h1 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Review</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {attempts.length} sentence{attempts.length !== 1 ? 's' : ''} you got wrong
        </p>
      </div>

      {error && (
        <p className="text-xs mb-4" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load review history: {error}
        </p>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto max-h-[75vh] space-y-4 pb-2"
      >
        {attempts.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-40 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <p>No wrong answers yet</p>
            <p className="text-xs mt-1">Keep practicing — mistakes will show up here for review.</p>
          </div>
        )}

        {attempts.map(attempt => (
          <WrongAnswerCard key={attempt.id} item={sentenceAttemptToWrongAnswer(attempt)} />
        ))}

        {loading && (
          <div className="flex justify-center py-6">
            <div
              className="w-4 h-4 rounded-full animate-spin"
              style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {!hasMore && attempts.length > 0 && (
          <p className="text-center text-xs py-6" style={{ color: 'var(--text-tertiary)' }}>
            All {attempts.length} loaded
          </p>
        )}
      </div>
    </div>
  )
}
