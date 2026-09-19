'use client'

import { useEffect, useRef } from 'react'
import { ChevronDownIcon } from '@/components/progress/progressIcons'
import { SearchIcon } from './icons'
import type { SortOrder } from '@/hooks/useVocabTable'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6]
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'other']

interface Props {
  hsk: number | null
  onHskChange: (v: number | null) => void
  pos: string | null
  onPosChange: (v: string | null) => void
  searchInput: string
  onSearchInputChange: (v: string) => void
  sort: SortOrder
  onSortChange: (v: SortOrder) => void
}

export function VocabFilterBar({
  hsk, onHskChange, pos, onPosChange,
  searchInput, onSearchInputChange,
  sort, onSortChange,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  // The "⌘K" hint is real -- global shortcut focuses the search input.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const selectedPill: React.CSSProperties = {
    backgroundColor: 'var(--accent-subtle)',
    border: '1px solid var(--accent)',
    color: 'var(--accent-text)',
  }
  const unselectedPill: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-tertiary)',
  }

  return (
    <div className="mb-4">
      <div className="relative mb-3">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <SearchIcon width={15} height={15} />
        </span>
        <input
          ref={searchRef}
          type="text"
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          placeholder="Search characters, pinyin, meanings, or English…"
          className="w-full rounded-xl pl-11 pr-16 py-3 text-sm focus:outline-none transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
        >
          ⌘ K
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>HSK Level</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onHskChange(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={hsk === null ? selectedPill : unselectedPill}
              >
                All HSK
              </button>
              {HSK_LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => onHskChange(hsk === l ? null : l)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={hsk === l ? selectedPill : unselectedPill}
                >
                  HSK {l}
                </button>
              ))}
            </div>
          </div>

          <div className="pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Word Type</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onPosChange(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={pos === null ? selectedPill : unselectedPill}
              >
                All types
              </button>
              {POS_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => onPosChange(pos === p ? null : p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                  style={pos === p ? selectedPill : unselectedPill}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative inline-flex items-center flex-shrink-0">
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value as SortOrder)}
            aria-label="Sort order"
            className="appearance-none rounded-xl py-2 pl-3 pr-8 text-xs font-medium transition-colors hover-border"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
          <span className="pointer-events-none absolute right-2.5" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronDownIcon width={12} height={12} />
          </span>
        </div>
      </div>
    </div>
  )
}
