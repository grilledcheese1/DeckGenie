'use client'

import type { RefObject } from 'react'
import { Card } from '@/components/ui/Card'
import { VocabIcon } from '@/components/ui/StatIcons'
import { FavoritesCard } from './FavoritesCard'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  totalWords: number
  favorites: FavoriteWord[]
  onExpandFavorites: () => void
  favoritesCardRef: RefObject<HTMLDivElement | null>
}

/**
 * Two stat cards (not the mockup's four) -- "Mastered" and "Studying"
 * are deliberately excluded per the user's original instruction.
 */
export function VocabStatsRow({ totalWords, favorites, onExpandFavorites, favoritesCardRef }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      <Card padding="lg" className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
        >
          <VocabIcon size={20} />
        </div>
        <div>
          <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{totalWords}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total words</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>All your vocabulary</p>
        </div>
      </Card>

      <FavoritesCard
        ref={favoritesCardRef}
        favorites={favorites}
        onExpand={onExpandFavorites}
      />
    </div>
  )
}
