'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { VocabBrowser } from '@/components/vocab/VocabBrowser'
import { useVocabSheet } from '@/hooks/useVocabSheet'
import { useProgress } from '@/hooks/useProgress'

/**
 * Standalone vocabulary browser page — same `VocabBrowser` filter/list/
 * card-toggle content the dashboard's `VocabSheet` overlay uses, just
 * embedded in `AppShell`'s content area instead of a fixed-overlay sheet.
 *
 * Reuses `useVocabSheet` as-is (it's already just data fetching, not
 * overlay-specific). `totalCount` comes from `useProgress`'s `vocabCount`
 * — the same source `dashboard/page.tsx` passes to `VocabSheet` — rather
 * than `words.length`, since `words` is only the current filtered/loaded
 * page.
 */
export default function VocabularyPage() {
  const { vocabCount } = useProgress()
  const {
    words, loading, hasMore, filters,
    open, loadMore, applyFilter, removeWord,
  } = useVocabSheet()

  // `useVocabSheet` initializes `loading: false` and only starts fetching
  // once `open()` runs inside the effect below (deferred past first
  // paint) — deliberately so, since `VocabSheet`'s dashboard call site
  // batches `setSheetOpen(true)` with `openVocab()` so `loading` is
  // already `true` on its very first render. This page has no such
  // batching, so without this flag the very first committed render would
  // see `words: [], loading: false` and flash `VocabBrowser`'s "No words
  // found" empty state before the fetch has even started. Tracked here,
  // locally, rather than changing `useVocabSheet` itself (which would
  // risk `VocabSheet`'s existing behavior).
  const [initialFetchStarted, setInitialFetchStarted] = useState(false)

  useEffect(() => {
    open()
    setInitialFetchStarted(true)
    // `open` is intentionally omitted from the dep array — its identity
    // changes on every `filters` update (see useVocabSheet), and
    // filter-driven refetches are already handled by `applyFilter`, so
    // including it here would refetch on every filter change in addition
    // to `applyFilter` already doing so.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto flex flex-col">
        <div className="mb-4">
          <h1 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Vocabulary</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Browse, search, and manage your unlocked words.
          </p>
        </div>

        <VocabBrowser
          words={words}
          loading={!initialFetchStarted || loading}
          hasMore={hasMore}
          filters={filters}
          totalCount={vocabCount}
          onLoadMore={loadMore}
          onFilterChange={applyFilter}
          onRemove={removeWord}
          listClassName="max-h-[65vh]"
        />
      </div>
    </AppShell>
  )
}
