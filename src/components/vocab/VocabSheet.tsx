'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'
import { VocabSlideView } from './VocabSlideView'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6]
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'other']
const HSK_COLORS: Record<number, string> = {
  1: 'text-emerald-400 bg-emerald-950 border-emerald-900',
  2: 'text-sky-400 bg-sky-950 border-sky-900',
  3: 'text-violet-400 bg-violet-950 border-violet-900',
  4: 'text-amber-400 bg-amber-950 border-amber-900',
  5: 'text-rose-400 bg-rose-950 border-rose-900',
  6: 'text-orange-400 bg-orange-950 border-orange-900',
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
  const overlayRef  = useRef<HTMLDivElement>(null)
  const sheetRef    = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')

  // Slide up on mount
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

  // Slide down on close
  function handleClose() {
    const tl = gsap.timeline({
      onComplete: onClose,
    })
    tl.to(sheetRef.current, { y: '100%', duration: 0.35, ease: 'power3.in' })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.2')
  }

  // Animate row removal
  function handleRemove(id: string, el: HTMLElement) {
    gsap.to(el, {
      opacity: 0,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginBottom: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => onRemove(id),
    })
  }

  // Infinite scroll detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      onLoadMore()
    }
  }, [onLoadMore])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div
        ref={sheetRef}
        className="w-full bg-stone-950 border-t border-stone-800 rounded-t-3xl flex flex-col"
        style={{ height: '87vh' }}
      >
        {/* Handle + header */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-stone-800 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-stone-100">Vocab list</h2>
              <p className="text-xs text-stone-600 mt-0.5">{totalCount} words active</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(m => m === 'list' ? 'cards' : 'list')}
                className="w-8 h-8 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors"
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
                className="w-8 h-8 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors"
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
        <div className="px-5 pb-3 flex-shrink-0 space-y-2 border-b border-stone-900">
          {/* Search */}
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange({ search: e.target.value })}
            placeholder="Search characters, pinyin, or English…"
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-700 focus:border-stone-600 focus:outline-none transition-colors"
          />

          {/* HSK filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => onFilterChange({ hsk: null })}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                filters.hsk === null
                  ? 'bg-stone-700 border-stone-600 text-stone-100'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
              }`}
            >
              All HSK
            </button>
            {HSK_LEVELS.map(l => (
              <button
                key={l}
                onClick={() => onFilterChange({ hsk: filters.hsk === l ? null : l })}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  filters.hsk === l
                    ? HSK_COLORS[l]
                    : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
                }`}
              >
                HSK {l}
              </button>
            ))}
          </div>

          {/* POS filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => onFilterChange({ pos: null })}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                filters.pos === null
                  ? 'bg-stone-700 border-stone-600 text-stone-100'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
              }`}
            >
              All types
            </button>
            {POS_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => onFilterChange({ pos: filters.pos === p ? null : p })}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium border capitalize transition-all ${
                  filters.pos === p
                    ? 'bg-stone-700 border-stone-600 text-stone-100'
                    : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-700'
                }`}
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
              <div className="flex flex-col items-center justify-center h-40 text-stone-600 text-sm">
                <p>No words found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            )}

            <div className="space-y-1">
              {words.map(word => (
                <WordRow
                  key={word.id}
                  word={word}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              </div>
            )}

            {!hasMore && words.length > 0 && (
              <p className="text-center text-xs text-stone-700 py-6">
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

// Separate component so each row manages its own ref for GSAP removal
function WordRow({
  word,
  onRemove,
}: {
  word: VocabWord
  onRemove: (id: string, el: HTMLElement) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  const HSK_BADGE: Record<number, string> = {
    1: 'text-emerald-400 bg-emerald-950 border-emerald-900',
    2: 'text-sky-400 bg-sky-950 border-sky-900',
    3: 'text-violet-400 bg-violet-950 border-violet-900',
    4: 'text-amber-400 bg-amber-950 border-amber-900',
    5: 'text-rose-400 bg-rose-950 border-rose-900',
    6: 'text-orange-400 bg-orange-950 border-orange-900',
  }

  return (
    <div
      ref={rowRef}
      className="flex items-center justify-between py-3 px-1 border-b border-stone-900 overflow-hidden"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* HSK badge */}
        <span className={`flex-shrink-0 text-xs font-medium border rounded-lg px-1.5 py-0.5 ${HSK_BADGE[word.hsk_level]}`}>
          {word.hsk_level}
        </span>

        {/* Hanzi + pinyin */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-hanzi text-lg text-stone-100 leading-tight">{word.word_zh}</span>
            <span className="text-xs text-stone-500">{word.pinyin}</span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5 leading-snug">{word.english}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        {/* POS tag */}
        <span className="text-xs text-stone-700 capitalize hidden sm:block">{word.pos}</span>

        {/* Accuracy dot — times_correct / times_seen */}
        {word.times_seen > 0 && (
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              word.times_correct / word.times_seen >= 0.8
                ? 'bg-emerald-500'
                : word.times_correct / word.times_seen >= 0.5
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`} />
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={() => rowRef.current && onRemove(word.id, rowRef.current)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-700 hover:text-red-400 hover:bg-red-950/40 transition-all"
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
