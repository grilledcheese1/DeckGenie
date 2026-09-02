'use client'

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
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

const GAP = 10   // px between the character and the tooltip
const EDGE = 8   // px of viewport breathing room to keep

/**
 * Decides whether the tooltip sits above the character (default) or flips
 * below it. It flips only when the space above the anchor can't fit the
 * tooltip *and* there's more room below — e.g. the character is a
 * breakdown chip near the top of the viewport, where an above-placement
 * tooltip would be clipped off-screen.
 *
 * `anchor` is the tooltip's positioned parent (the char span / chip);
 * `tipHeight` is the rendered tooltip height. Runs on mount and on resize.
 */
function resolvePlacement(anchor: HTMLElement, tipHeight: number): 'top' | 'bottom' {
  const rect = anchor.getBoundingClientRect()
  const spaceAbove = rect.top - GAP - EDGE
  const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE
  if (spaceAbove < tipHeight && spaceBelow > spaceAbove) return 'bottom'
  return 'top'
}

export function CharTooltip({
  segment, pinyin, english, hsk, pos,
  vocabWord, onMore, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top')

  const measure = useCallback(() => {
    const el = ref.current
    const anchor = el?.parentElement
    if (!el || !anchor) return
    setPlacement(resolvePlacement(anchor, el.offsetHeight))
  }, [])

  // Layout effect so the flip is resolved before the browser paints —
  // no visible jump from an above-placement to a below-placement.
  useLayoutEffect(() => {
    measure()
  }, [measure, segment])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    if (!ref.current) return
    const fromY = placement === 'top' ? 6 : -6
    gsap.fromTo(ref.current,
      { opacity: 0, y: fromY, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
    )
  }, [segment, placement])

  const tone = getToneFromPinyin(pinyin)
  const accuracy = vocabWord && vocabWord.times_seen > 0
    ? Math.round((vocabWord.times_correct / vocabWord.times_seen) * 100)
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={e => { e.stopPropagation(); onClose() }}
      />

      <div
        ref={ref}
        className="absolute z-40 pointer-events-auto"
        style={{
          ...(placement === 'top'
            ? { bottom: `calc(100% + ${GAP}px)` }
            : { top: `calc(100% + ${GAP}px)` }),
          left: '50%',
          transform: 'translateX(-50%)',
          width: '160px',
        }}
      >
        {placement === 'bottom' && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: '100%',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid var(--border-hover)',
            }}
          />
        )}

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
            <span className="text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
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

        {placement === 'top' && (
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
        )}
      </div>
    </>
  )
}
