'use client'

import { useRef, useState } from 'react'
import { useProgress } from '@/hooks/useProgress'
import { useVocabTable } from '@/hooks/useVocabTable'
import { VocabPageHeader } from '@/components/vocab/VocabPageHeader'
import { VocabStatsRow } from '@/components/vocab/VocabStatsRow'
import { VocabFilterBar } from '@/components/vocab/VocabFilterBar'
import { VocabTable } from '@/components/vocab/VocabTable'
import { VocabPagination } from '@/components/vocab/VocabPagination'
import { FavoritesExpandedPanel } from '@/components/vocab/FavoritesExpandedPanel'

export default function VocabularyPage() {
  const { vocabCount, settings } = useProgress()
  const {
    words, totalCount, totalPages, loading, error,
    page, setPage,
    hsk, setHsk,
    pos, setPos,
    searchInput, setSearchInput,
    sort, setSort,
    favorites, setFavorite, unfavorite, deleteWord,
  } = useVocabTable()

  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const favoritesCardRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen px-6 py-8 w-full max-w-6xl mx-auto">
      <VocabPageHeader vocabCount={vocabCount} hskLevel={settings?.starting_hsk} />

      <VocabStatsRow
        totalWords={vocabCount}
        favorites={favorites}
        onExpandFavorites={() => setFavoritesExpanded(true)}
        favoritesCardRef={favoritesCardRef}
      />

      <VocabFilterBar
        hsk={hsk} onHskChange={setHsk}
        pos={pos} onPosChange={setPos}
        searchInput={searchInput} onSearchInputChange={setSearchInput}
        sort={sort} onSortChange={setSort}
      />

      {error && (
        <p className="text-xs mb-3" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load vocabulary: {error}
        </p>
      )}

      <VocabTable
        words={words}
        loading={loading}
        onToggleFavorite={word => setFavorite(word, !word.is_favorite)}
        onDelete={deleteWord}
      />

      <VocabPagination
        page={page}
        totalPages={totalPages}
        shownCount={words.length}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      {favoritesExpanded && (
        <FavoritesExpandedPanel
          favorites={favorites}
          anchorRef={favoritesCardRef}
          onUnfavorite={unfavorite}
          onClose={() => setFavoritesExpanded(false)}
        />
      )}
    </div>
  )
}
