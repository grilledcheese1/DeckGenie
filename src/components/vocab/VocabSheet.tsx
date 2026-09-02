'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'
import { VocabBrowser, type VocabFilters } from './VocabBrowser'

interface Props {
  words: VocabWord[]
  loading: boolean
  hasMore: boolean
  filters: VocabFilters
  onClose: () => void
  onLoadMore: () => void
  onFilterChange: (patch: Partial<VocabFilters>) => void
  onRemove: (id: string) => void
  totalCount: number
}

/**
 * Fixed `inset-0` GSAP slide-up sheet shell — this overlay/animation shell
 * is sheet-specific and stays here. The filter pills, word list, and
 * view-mode toggle + `VocabSlideView` integration live in the shared
 * `VocabBrowser`, which this component wraps in its overlay chrome (handle
 * bar + title + close button).
 */
export function VocabSheet({
  words, loading, hasMore, filters,
  onClose, onLoadMore, onFilterChange, onRemove, totalCount,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
      gsap.fromTo(sheetRef.current,
        { y: '100%' },
        { y: '0%', duration: 0.45, ease: 'power3.out' }
      )
    })
    return () => ctx.revert()
  }, [])

  function handleClose() {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(sheetRef.current, { y: '100%', duration: 0.35, ease: 'power3.in' })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.2')
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div
        ref={sheetRef}
        className="w-full rounded-t-3xl flex flex-col"
        style={{
          height: '87vh',
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Handle + header */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Vocab list</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover-border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
              }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <VocabBrowser
          words={words}
          loading={loading}
          hasMore={hasMore}
          filters={filters}
          totalCount={totalCount}
          onLoadMore={onLoadMore}
          onFilterChange={onFilterChange}
          onRemove={onRemove}
          listClassName="flex-1"
        />
      </div>
    </div>
  )
}
