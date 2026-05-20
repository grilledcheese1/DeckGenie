'use client'

import { useState } from 'react'
import { CharTooltip } from './CharTooltip'
import { CharDetailSheet } from './CharDetailSheet'
import { segmentSentence } from '@/lib/chinese'
import type { VocabWord, GenerateResponse } from '@/types'

interface Props {
  sentence: GenerateResponse
  vocabList: VocabWord[]
}

interface ActiveSegment {
  segment: string
  index: number
}

export function AnalysisSentence({ sentence, vocabList }: Props) {
  const [active, setActive]           = useState<ActiveSegment | null>(null)
  const [showSheet, setShowSheet]     = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const segments = segmentSentence(sentence.sentence_zh, sentence.vocab_used)

  const isPunctuation = (s: string) =>
    /^[。，？！、；：""''（）【】…—]$/.test(s)

  function getVocabForSegment(seg: string): VocabWord | null {
    return vocabList.find(w => w.word_zh === seg) ?? null
  }

  function getInfoForSegment(seg: string) {
    const vocab = getVocabForSegment(seg)
    if (vocab) {
      return {
        pinyin:  vocab.pinyin,
        english: vocab.english,
        hsk:     vocab.hsk_level,
        pos:     vocab.pos,
      }
    }
    return { pinyin: '', english: '—', hsk: 1 as const, pos: 'other' }
  }

  const activeInfo  = active ? getInfoForSegment(active.segment) : null
  const activeVocab = active ? getVocabForSegment(active.segment) : null

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
                  opacity: active ? 0.25 : 0.6,
                  transition: 'opacity 0.2s',
                }}
              >
                {seg}
              </span>
            )
          }

          const info      = getInfoForSegment(seg)
          const isActive  = active?.index === i
          const isDimmed  = active !== null && !isActive
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
              onClick={() => {
                if (isActive) {
                  setActive(null)
                } else {
                  setActive({ segment: seg, index: i })
                  setShowSheet(false)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (isActive) {
                    setActive(null)
                  } else {
                    setActive({ segment: seg, index: i })
                    setShowSheet(false)
                  }
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
                  onMore={() => setShowSheet(true)}
                  onClose={() => setActive(null)}
                />
              )}
            </span>
          )
        })}
      </div>

      {showSheet && active && activeInfo && (
        <CharDetailSheet
          segment={active.segment}
          pinyin={activeInfo.pinyin}
          english={activeInfo.english}
          hsk={activeInfo.hsk}
          pos={activeInfo.pos}
          vocabWord={activeVocab}
          onClose={() => {
            setShowSheet(false)
            setActive(null)
          }}
        />
      )}
    </>
  )
}
