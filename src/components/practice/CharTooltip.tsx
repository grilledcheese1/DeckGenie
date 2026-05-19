'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'
import { getToneFromPinyin, TONE_LABELS } from '@/lib/chinese'

interface Props {
  segment: string
  pinyin: string
  english: string
  hsk: number
  pos: string
  vocabWord: VocabWord | null
  onMore: () => void
  onClose: () => void
}

export function CharTooltip({
  segment, pinyin, english, hsk, pos,
  vocabWord, onMore, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 6, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
    )
  }, [segment])

  const tone = getToneFromPinyin(pinyin)
  const accuracy = vocabWord && vocabWord.times_seen > 0
    ? Math.round((vocabWord.times_correct / vocabWord.times_seen) * 100)
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      <div
        ref={ref}
        className="absolute z-40 pointer-events-auto"
        style={{
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '160px',
        }}
      >
        <div
          className="rounded-2xl p-3"
          style={{
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-hover)',
          }}
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-hanzi text-xl" style={{ color: 'var(--text-primary)' }}>
              {segment}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {pinyin}
            </span>
          </div>

          <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            {TONE_LABELS[tone]}
          </p>

          <p className="text-xs mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            {english}
          </p>

          <div className="flex gap-1.5 mb-2.5 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
            >
              HSK {hsk}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-lg capitalize"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-tertiary)',
                border: '0.5px solid var(--border)',
              }}
            >
              {pos}
            </span>
          </div>

          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: '0.5px solid var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {vocabWord
                ? `${vocabWord.times_seen}× · ${accuracy ?? 0}% acc.`
                : 'Not in vocab'}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onMore() }}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              More →
            </button>
          </div>
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '100%',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid var(--border-hover)',
          }}
        />
      </div>
    </>
  )
}
