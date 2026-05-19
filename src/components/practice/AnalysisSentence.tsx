'use client'

import { useState, useRef } from 'react'
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
  const segRefs                         = useRef<(HTMLSpanElement | null)[]>([])

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
    return { pinyin: '—', english: '—', hsk: 1, pos: 'other' }
  }

  const activeInfo  = active ? getInfoForSegment(active.segment) : null
  const activeVocab = active ? getVocabForSegment(active.segment) : null

  return (
    <>
      <div className="relative" style={{ lineHeight: 1.2 }}>
        {segments.map((seg, i) => {
          if (isPunctuation(seg)) {
            return (
              <span
                key={i}
                className="font-hanzi"
                style={{
                  fontSize: '32px',
                  color: 'var(--text-tertiary)',
                  opacity: active ? 0.3 : 0.7,
                  transition: 'opacity 0.2s',
                }}
              >
                {seg}
              </span>
            )
          }

          const isActive = active?.index === i
          const isDimmed = active !== null && !isActive

          return (
            <span
              key={i}
              ref={el => { segRefs.current[i] = el }}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              className="relative inline-block cursor-pointer select-none"
              style={{ position: 'relative' }}
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
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
            >
              <span
                className="font-hanzi transition-all duration-200"
                style={{
                  fontSize: '32px',
                  display: 'inline-block',
                  color: 'var(--text-primary)',
                  opacity: isDimmed ? 0.3 : 1,
                  filter: isActive ? 'brightness(1.45)' : 'none',
                  background: isActive
                    ? 'var(--char-highlight)'
                    : hoveredIndex === i
                    ? 'var(--char-hover-bg)'
                    : 'transparent',
                  borderRadius: '4px',
                  padding: '0 1px',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {seg}
              </span>

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
