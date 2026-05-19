'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'
import { VocabSlideView } from './VocabSlideView'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6]
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'other']

const HSK_BADGE_STYLES: Record<number, React.CSSProperties> = {
  1: { color: 'var(--hsk-1-color)', backgroundColor: 'var(--hsk-1-bg)', border: '1px solid var(--hsk-1-border)' },
  2: { color: 'var(--hsk-2-color)', backgroundColor: 'var(--hsk-2-bg)', border: '1px solid var(--hsk-2-border)' },
  3: { color: 'var(--hsk-3-color)', backgroundColor: 'var(--hsk-3-bg)', border: '1px solid var(--hsk-3-border)' },
  4: { color: 'var(--hsk-4-color)', backgroundColor: 'var(--hsk-4-bg)', border: '1px solid var(--hsk-4-border)' },
  5: { color: 'var(--hsk-5-color)', backgroundColor: 'var(--hsk-5-bg)', border: '1px solid var(--hsk-5-border)' },
  6: { color: 'var(--hsk-6-color)', backgroundColor: 'var(--hsk-6-bg)', border: '1px solid var(--hsk-6-border)' },
}

interface Filters {
  hsk: number | null
  pos: string | null
  topic: string | null
  search: string
}

interface Props {
  words: VocabWord[]
  loading: boolean
  hasMore: boolean
  filters: Filters
  onClose: () => void
  onLoadMore: () => void
  onFilterChange: (patch: Partial<Filters>) => void
  onRemove: (id: string) => void
  totalCount: number
}

export function VocabSheet({
  words, loading, hasMore, filters,
  onClose, onLoadMore, onFilterChange, onRemove, totalCount,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useRef<HTMLDivElement>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')

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

  function handleRemove(id: string, el: HTMLElement) {
    gsap.to(el, {
      opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.28, ease: 'power2.in', onComplete: () => onRemove(id),
    })
  }

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) onLoadMore()
  }, [onLoadMore])

  const unselectedPill: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-tertiary)',
  }
  const selectedAllPill: React.CSSProperties = {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-hover)',
    color: 'var(--text-primary)',
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
            <div>
              <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Vocab list</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{totalCount} words active</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(m => m === 'list' ? 'cards' : 'list')}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover-border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-tertiary)',
                }}
                aria-label={viewMode === 'list' ? 'Switch to card view' : 'Switch to list view'}
              >
                {viewMode === 'list' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 3H8a2 2 0 0 0-2 2"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                )}
              </button>
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
        </div>

        {/* Filters */}
        <div
          className="px-5 pb-3 flex-shrink-0 space-y-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange({ search: e.target.value })}
            placeholder="Search characters, pinyin, or English…"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />

          {/* HSK filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => onFilterChange({ hsk: null })}
              className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={filters.hsk === null ? selectedAllPill : unselectedPill}
            >
              All HSK
            </button>
            {HSK_LEVELS.map(l => (
              <button
                key={l}
                onClick={() => onFilterChange({ hsk: filters.hsk === l ? null : l })}
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={filters.hsk === l ? HSK_BADGE_STYLES[l] : unselectedPill}
              >
                HSK {l}
              </button>
            ))}
          </div>

          {/* POS filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => onFilterChange({ pos: null })}
              className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={filters.pos === null ? selectedAllPill : unselectedPill}
            >
              All types
            </button>
            {POS_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => onFilterChange({ pos: filters.pos === p ? null : p })}
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                style={filters.pos === p ? selectedAllPill : unselectedPill}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Word list or slide view */}
        {viewMode === 'list' ? (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-3"
          >
            {words.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-40 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <p>No words found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            )}

            <div className="space-y-1">
              {words.map(word => (
                <WordRow key={word.id} word={word} onRemove={handleRemove} />
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-6">
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
                />
              </div>
            )}

            {!hasMore && words.length > 0 && (
              <p className="text-center text-xs py-6" style={{ color: 'var(--text-tertiary)' }}>
                All {words.length} words loaded
              </p>
            )}
          </div>
        ) : (
          <VocabSlideView
            words={words}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
          />
        )}
      </div>
    </div>
  )
}

function WordRow({
  word,
  onRemove,
}: {
  word: VocabWord
  onRemove: (id: string, el: HTMLElement) => void
}) {
  const rowRef     = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const accuracy = word.times_seen > 0 ? word.times_correct / word.times_seen : null
  const dotColor = accuracy === null ? null
    : accuracy >= 0.8 ? '#10b981'
    : accuracy >= 0.5 ? '#f59e0b'
    : '#ef4444'

  return (
    <div
      ref={rowRef}
      className="flex items-center justify-between py-3 px-1 overflow-hidden"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex-shrink-0 text-xs font-medium rounded-lg px-1.5 py-0.5"
          style={HSK_BADGE_STYLES[word.hsk_level]}
        >
          {word.hsk_level}
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-hanzi text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{word.pinyin}</span>
          </div>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{word.english}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="text-xs capitalize hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>{word.pos}</span>

        {dotColor && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
          </div>
        )}

        <button
          onClick={() => rowRef.current && onRemove(word.id, rowRef.current)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={hovered
            ? { color: '#ef4444', backgroundColor: 'rgba(127,29,29,0.25)' }
            : { color: 'var(--text-tertiary)' }
          }
          aria-label={`Remove ${word.word_zh}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
