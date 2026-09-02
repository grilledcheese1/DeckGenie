'use client'

import { useState } from 'react'
import { CharTooltip } from './CharTooltip'
import { CharDetailSheet } from './CharDetailSheet'
import { useCharPopup } from './useCharPopup'
import { segmentSentence } from '@/lib/chinese'
import type { VocabWord, GenerateResponse } from '@/types'

interface Props {
  sentence: GenerateResponse
  vocabList: VocabWord[]
}

export function AnalysisSentence({ sentence, vocabList }: Props) {
  const { activeKey, activeSegment, showSheet, getVocab, getInfo, toggle, close, openSheet } =
    useCharPopup(vocabList)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const segments = segmentSentence(sentence.sentence_zh, sentence.vocab_used)

  const isPunctuation = (s: string) =>
    /^[。，？！、；：""''（）【】…—]$/.test(s)

  const activeInfo  = activeSegment ? getInfo(activeSegment) : null
  const activeVocab = activeSegment ? getVocab(activeSegment) : null

  return (
    <>
      <div
        className="flex flex-wrap items-end"
        style={{ gap: '2px 4px', lineHeight: 1 }}
      >
        {segments.map((seg, i) => {
          if (isPunctuation(seg)) {
            return (
              <span
                key={i}
                className="font-hanzi"
                style={{
                  fontSize: '30px',
                  color: 'var(--text-tertiary)',
                  alignSelf: 'flex-end',
                  paddingBottom: '2px',
                  opacity: activeKey ? 0.25 : 0.6,
                  transition: 'opacity 0.2s',
                }}
              >
                {seg}
              </span>
            )
          }

          const info      = getInfo(seg)
          const key       = String(i)
          const isActive  = activeKey === key
          const isDimmed  = activeKey !== null && !isActive
          const isHovered = hoveredIndex === i && !isActive

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              className="relative inline-flex flex-col items-center cursor-pointer select-none"
              style={{
                opacity: isDimmed ? 0.28 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => toggle(key, seg)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(key, seg)
                }
              }}
            >
              {/* Pinyin — always visible above */}
              <span
                className="text-center leading-none mb-1"
                style={{
                  fontSize: '11px',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-tertiary)',
                  transition: 'color 0.2s',
                  minWidth: '100%',
                  whiteSpace: 'nowrap',
                }}
              >
                {info.pinyin || ' '}
              </span>

              {/* Hanzi */}
              <span
                className="font-hanzi"
                style={{
                  fontSize: '30px',
                  color: 'var(--text-primary)',
                  display: 'inline-block',
                  filter: isActive ? 'brightness(1.5)' : 'none',
                  background: isActive
                    ? 'var(--char-highlight)'
                    : isHovered
                      ? 'var(--char-hover-bg)'
                      : 'transparent',
                  borderRadius: '4px',
                  padding: '0 2px',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.15s, filter 0.15s, background 0.15s',
                }}
              >
                {seg}
              </span>

              {/* Tap affordance dot */}
              <span
                className="block rounded-full mt-1"
                style={{
                  width: '3px',
                  height: '3px',
                  background: isActive ? 'var(--accent)' : 'var(--border-hover)',
                  transition: 'background 0.2s',
                }}
              />

              {/* Tooltip */}
              {isActive && !showSheet && activeInfo && (
                <CharTooltip
                  segment={seg}
                  pinyin={activeInfo.pinyin}
                  english={activeInfo.english}
                  hsk={activeInfo.hsk}
                  pos={activeInfo.pos}
                  vocabWord={activeVocab}
                  onMore={openSheet}
                  onClose={close}
                />
              )}
            </span>
          )
        })}
      </div>

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
    </>
  )
}
