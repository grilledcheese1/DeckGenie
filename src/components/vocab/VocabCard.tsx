'use client'

import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'

const HSK_BADGE_STYLES: Record<number, React.CSSProperties> = {
  1: { color: 'var(--hsk-1-color)', backgroundColor: 'var(--hsk-1-bg)', border: '1px solid var(--hsk-1-border)' },
  2: { color: 'var(--hsk-2-color)', backgroundColor: 'var(--hsk-2-bg)', border: '1px solid var(--hsk-2-border)' },
  3: { color: 'var(--hsk-3-color)', backgroundColor: 'var(--hsk-3-bg)', border: '1px solid var(--hsk-3-border)' },
  4: { color: 'var(--hsk-4-color)', backgroundColor: 'var(--hsk-4-bg)', border: '1px solid var(--hsk-4-border)' },
  5: { color: 'var(--hsk-5-color)', backgroundColor: 'var(--hsk-5-bg)', border: '1px solid var(--hsk-5-border)' },
  6: { color: 'var(--hsk-6-color)', backgroundColor: 'var(--hsk-6-bg)', border: '1px solid var(--hsk-6-border)' },
}

export function VocabCard({ word }: { word: VocabWord }) {
  const [revealed, setRevealed] = useState(false)
  const hanziRef   = useRef<HTMLParagraphElement>(null)
  const englishRef = useRef<HTMLParagraphElement>(null)

  function handleTap() {
    if (!revealed) {
      setRevealed(true)
      gsap.fromTo(hanziRef.current,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
      )
      gsap.fromTo(englishRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.1 }
      )
    } else {
      const tl = gsap.timeline({ onComplete: () => setRevealed(false) })
      tl.to(englishRef.current, { opacity: 0, y: 8, duration: 0.2, ease: 'power2.in' })
      tl.to(hanziRef.current,   { opacity: 0, scale: 0.85, duration: 0.2, ease: 'power2.in' }, '-=0.1')
    }
  }

  const accuracy = word.times_seen > 0 ? word.times_correct / word.times_seen : null
  const dotColor = accuracy === null ? null
    : accuracy >= 0.8 ? '#10b981'
    : accuracy >= 0.5 ? '#f59e0b'
    : '#ef4444'

  return (
    <div
      onClick={handleTap}
      className="relative w-full h-full flex flex-col items-center justify-center select-none cursor-pointer"
    >
      {/* HSK badge */}
      <span
        className="absolute top-0 left-0 text-xs font-medium rounded-lg px-1.5 py-0.5"
        style={HSK_BADGE_STYLES[word.hsk_level]}
      >
        HSK {word.hsk_level}
      </span>

      {/* Accuracy dot */}
      {dotColor && (
        <div
          className="absolute top-0 right-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}

      {/* Hanzi — revealed only */}
      {revealed && (
        <p ref={hanziRef} className="font-hanzi text-6xl mb-4 leading-none" style={{ color: 'var(--text-primary)' }}>
          {word.word_zh}
        </p>
      )}

      {/* Pinyin — always visible */}
      <p className="text-2xl tracking-wide" style={{ color: 'var(--text-secondary)' }}>{word.pinyin}</p>

      {/* English — revealed only */}
      {revealed && (
        <p ref={englishRef} className="text-sm mt-3 text-center leading-snug max-w-[80%]" style={{ color: 'var(--text-secondary)' }}>
          {word.english}
        </p>
      )}

      {/* Tap hint */}
      {!revealed && (
        <p className="absolute bottom-0 text-xs" style={{ color: 'var(--text-tertiary)' }}>tap to reveal</p>
      )}
    </div>
  )
}
