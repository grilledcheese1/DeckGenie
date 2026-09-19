'use client'

import { forwardRef } from 'react'
import { Card } from '@/components/ui/Card'
import { StarIcon } from './icons'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  favorites: FavoriteWord[]
  onExpand: () => void
}

/**
 * Replaces the plain "12 Favorites" stat count with a live preview of the
 * top 3 favorited words, plus a "+N more" link that opens
 * `FavoritesExpandedPanel`. Forwards its ref so that panel can anchor
 * itself to this card's on-screen position.
 */
export const FavoritesCard = forwardRef<HTMLDivElement, Props>(function FavoritesCard(
  { favorites, onExpand },
  ref
) {
  const preview = favorites.slice(0, 3)
  const remaining = favorites.length - preview.length

  return (
    <Card
      ref={ref}
      padding="lg"
      className="cursor-pointer transition-colors hover-border"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
        >
          <StarIcon filled width={18} height={18} />
        </div>
        <div>
          <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{favorites.length}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Favorites</p>
        </div>
      </div>

      {preview.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No favorites yet — star a word below.</p>
      ) : (
        <div>
          {preview.map(word => (
            <div
              key={word.id}
              className="flex items-baseline justify-between py-1 gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="min-w-0 truncate">
                <span className="font-hanzi text-sm mr-2" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>
                <span className="text-xs" style={{ color: 'var(--accent-text)' }}>{word.pinyin}</span>
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{word.english}</span>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-xs text-center mt-1.5" style={{ color: 'var(--accent-text)' }}>
              +{remaining} more · Show all →
            </p>
          )}
        </div>
      )}
    </Card>
  )
})
