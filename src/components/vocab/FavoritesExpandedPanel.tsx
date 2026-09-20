'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from 'gsap'
import { StarIcon } from './icons'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  favorites: FavoriteWord[]
  anchorRef: RefObject<HTMLDivElement | null>
  onUnfavorite: (id: string) => void
  onClose: () => void
}

/**
 * The "expand that column" view -- grows anchored at the favorites card's
 * own top-right corner (measured via `anchorRef`, not a centered dialog),
 * over a dimmed + blurred backdrop matching `UnlockModal`'s convention.
 * Caps its own height and scrolls internally once favorites overflow it.
 */
export function FavoritesExpandedPanel({ favorites, anchorRef, onUnfavorite, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  // Guards the entrance tween below so it fires exactly once per mount --
  // `measure()` also runs on scroll/resize while the panel is open, which
  // would otherwise produce a new `pos` object each time and re-trigger
  // gsap.fromTo, snapping the panel back to its start state (a visible
  // flicker) on every scroll/resize event.
  const hasAnimatedRef = useRef(false)

  useLayoutEffect(() => {
    function measure() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!panelRef.current || !pos || hasAnimatedRef.current) return
    hasAnimatedRef.current = true
    gsap.fromTo(panelRef.current,
      { opacity: 0, scale: 0.95, y: -8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' }
    )
  }, [pos])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {pos && (
        <div
          ref={panelRef}
          className="fixed z-50 w-80 max-h-[70vh] flex flex-col rounded-2xl p-4"
          style={{
            top: pos.top,
            right: pos.right,
            transformOrigin: 'top right',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-hover)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              All Favorites ({favorites.length})
            </p>
            <button
              onClick={onClose}
              className="text-lg leading-none"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto space-y-0.5">
            {favorites.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No favorites yet.</p>
            )}
            {favorites.map(word => (
              <div
                key={word.id}
                className="flex items-center justify-between py-1.5 gap-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="min-w-0 truncate">
                  <span className="font-hanzi text-base mr-2" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>
                  <span className="text-xs" style={{ color: 'var(--accent-text)' }}>{word.pinyin}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{word.english}</span>
                </span>
                <button
                  onClick={() => onUnfavorite(word.id)}
                  aria-label={`Unfavorite ${word.word_zh}`}
                  className="flex-shrink-0"
                  style={{ color: '#fbbf24' }}
                >
                  <StarIcon filled width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
