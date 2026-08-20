'use client'

import { useEffect } from 'react'
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

  // Load the initial page once on mount. `open` is intentionally omitted
  // from the dep array — its identity changes on every `filters` update
  // (see useVocabSheet), and filter-driven refetches are already handled
  // by `applyFilter`, so including it here would refetch on every filter
  // change in addition to `applyFilter` already doing so.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { open() }, [])

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
          loading={loading}
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
