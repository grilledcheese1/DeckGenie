'use client'

import { Card } from '@/components/ui/Card'
import { CharTooltip } from './CharTooltip'
import { CharDetailSheet } from './CharDetailSheet'
import { useCharPopup } from './useCharPopup'
import type { SentenceStructureSegment, VocabWord } from '@/types'

interface Props {
  segments: SentenceStructureSegment[] | null | undefined
  vocabList: VocabWord[]
}

const ROLE_LABELS: Record<SentenceStructureSegment['role'], string> = {
  S:     'Subject',
  V:     'Verb',
  O:     'Object',
  Q:     'Question',
  MW:    'Measure word',
  Other: 'Other',
}

/**
 * Renders `GradeResponse.sentenceStructure` — a simple row of
 * segment+role-badge pairs. `sentenceStructure` is nullable (not yet
 * cached/generated for this sentence, or a pre-migration deploy), so this
 * always renders a graceful fallback rather than an empty/broken card.
 *
 * Each segment chip is tappable and opens the same `CharTooltip` →
 * `CharDetailSheet` popup as the analysed sentence, via the shared
 * `useCharPopup` hook (info looked up from the passed `vocabList`; a
 * segment with no matching vocab word shows the same "—" fallback the
 * analysed sentence shows for particles).
 */
export function SentenceBreakdownCard({ segments, vocabList }: Props) {
  const { activeKey, activeSegment, showSheet, getVocab, getInfo, toggle, close, openSheet } =
    useCharPopup(vocabList)

  const activeInfo  = activeSegment ? getInfo(activeSegment) : null
  const activeVocab = activeSegment ? getVocab(activeSegment) : null

  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Sentence breakdown
      </p>
      {!segments || segments.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Not available for this sentence yet.
        </p>
      ) : (
        <>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Structure
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
            {[...new Set(segments.map(s => ROLE_LABELS[s.role]))].join(' + ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {segments.map((seg, i) => {
              const key      = String(i)
              const isActive = activeKey === key
              const isDimmed = activeKey !== null && !isActive
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  className="relative flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 cursor-pointer select-none"
                  style={{
                    background: isActive ? 'var(--char-highlight)' : 'var(--bg-tertiary)',
                    border: '0.5px solid var(--border)',
                    opacity: isDimmed ? 0.4 : 1,
                    transition: 'opacity 0.2s, background 0.15s',
                  }}
                  onClick={() => toggle(key, seg.segment)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(key, seg.segment)
                    }
                  }}
                >
                  <span className="font-hanzi text-base leading-none" style={{ color: 'var(--text-primary)' }}>
                    {seg.segment}
                  </span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: 'var(--accent-text)' }}
                    title={ROLE_LABELS[seg.role]}
                  >
                    {seg.role}
                  </span>

                  {isActive && !showSheet && activeInfo && (
                    <CharTooltip
                      segment={seg.segment}
                      pinyin={activeInfo.pinyin}
                      english={activeInfo.english}
                      hsk={activeInfo.hsk}
                      pos={activeInfo.pos}
                      vocabWord={activeVocab}
                      onMore={openSheet}
                      onClose={close}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showSheet && activeSegment && activeInfo && (
        <CharDetailSheet
          segment={activeSegment}
          pinyin={activeInfo.pinyin}
          english={activeInfo.english}
          hsk={activeInfo.hsk}
          pos={activeInfo.pos}
          vocabWord={activeVocab}
          onClose={close}
        />
      )}
    </Card>
  )
}
