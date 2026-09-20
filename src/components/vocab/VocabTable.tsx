'use client'

import { useState } from 'react'
import type { VocabWord } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { StarIcon, MoreIcon } from './icons'
import { VocabRowMenu } from './VocabRowMenu'

// Local to this page -- Badge.tsx's shared POS_STYLE stays neutral so the
// practice page's analysis table doesn't change appearance (see design
// doc Scope). Noun/Other reuse existing theme tokens; Adjective/Verb/
// Adverb are new hardcoded colors, following the same precedent
// Badge.tsx's STATUS_STYLES already sets for non-theme-flipping colors.
const POS_COLORS: Record<string, React.CSSProperties> = {
  adjective: { color: '#60a5fa', backgroundColor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' },
  verb:      { color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' },
  adverb:    { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' },
  noun:      { color: 'var(--accent-text)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' },
  other:     { color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' },
}

interface StatusInfo { label: string; color: string }

// Derived from the real, server-maintained mastery_level column (set by
// the record_word_attempt RPC), not a client-side accuracy heuristic --
// see Decision 4 in the design doc.
function statusFor(word: VocabWord): StatusInfo {
  if (word.mastery_level === 'mastered')  return { label: 'Mastered', color: 'var(--accent-text)' }
  if (word.mastery_level === 'reviewing') return { label: 'Review',   color: '#f59e0b' }
  if (word.times_seen === 0)              return { label: 'New',      color: '#60a5fa' }
  return { label: 'Studying', color: 'var(--accent-text)' }
}

interface Props {
  words: VocabWord[]
  loading: boolean
  onToggleFavorite: (word: VocabWord) => void
  onDelete: (id: string) => void
}

const COLUMN_COUNT = 9

export function VocabTable({ words, loading, onToggleFavorite, onDelete }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const allChecked = words.length > 0 && words.every(w => checked[w.id])

  function toggleAll() {
    setChecked(allChecked ? {} : Object.fromEntries(words.map(w => [w.id, true])))
  }

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="w-10 px-4 py-3">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
            </th>
            <Th>Character</Th>
            <Th>Pinyin</Th>
            <Th>Meaning</Th>
            <Th>Type</Th>
            <Th>HSK</Th>
            <Th>Status</Th>
            <th className="w-10" />
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {words.map(word => {
            const status = statusFor(word)
            const posStyle = POS_COLORS[word.pos] ?? POS_COLORS.other
            return (
              <tr key={word.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[word.id])}
                    onChange={() => setChecked(prev => ({ ...prev, [word.id]: !prev[word.id] }))}
                    aria-label={`Select ${word.word_zh}`}
                  />
                </td>
                <td className="px-4 py-3 font-hanzi text-base" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{word.pinyin}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{word.english}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center text-xs font-medium rounded-lg px-2 py-0.5 capitalize" style={posStyle}>
                    {word.pos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={`hsk-${word.hsk_level}`}>HSK {word.hsk_level}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: status.color }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <button
                    onClick={() => onToggleFavorite(word)}
                    aria-label={word.is_favorite ? `Unfavorite ${word.word_zh}` : `Favorite ${word.word_zh}`}
                    style={{ color: word.is_favorite ? '#fbbf24' : 'var(--text-tertiary)' }}
                  >
                    <StarIcon filled={word.is_favorite} width={16} height={16} />
                  </button>
                </td>
                <td className="px-2 py-3 text-center relative">
                  <button
                    onClick={() => setOpenMenuId(id => id === word.id ? null : word.id)}
                    aria-label="More actions"
                    // position+zIndex above VocabRowMenu's z-30 full-screen
                    // backdrop -- without this, opening row A's menu then
                    // clicking row B's "•••" button hits A's backdrop
                    // first (closing A) instead of B's onClick, requiring
                    // a second click to actually open B.
                    style={{ color: 'var(--text-tertiary)', position: 'relative', zIndex: 35 }}
                  >
                    <MoreIcon width={16} height={16} />
                  </button>
                  {openMenuId === word.id && (
                    <VocabRowMenu
                      word={word}
                      onDelete={() => { onDelete(word.id); setOpenMenuId(null) }}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </td>
              </tr>
            )
          })}

          {!loading && words.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No words found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </th>
  )
}
