'use client'

import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'

const HSK_BADGE_STYLES: Record<number, React.CSSProperties> = {
  1: { color: '#34d399', backgroundColor: 'rgba(6,78,59,0.5)',   border: '1px solid #065f46' },
  2: { color: '#38bdf8', backgroundColor: 'rgba(8,47,73,0.5)',   border: '1px solid #0c4a6e' },
  3: { color: '#a78bfa', backgroundColor: 'rgba(46,16,101,0.5)', border: '1px solid #4c1d95' },
  4: { color: '#fbbf24', backgroundColor: 'rgba(69,26,3,0.5)',   border: '1px solid #78350f' },
  5: { color: '#fb7185', backgroundColor: 'rgba(76,5,25,0.5)',   border: '1px solid #881337' },
  6: { color: '#fb923c', backgroundColor: 'rgba(67,20,7,0.5)',   border: '1px solid #7c2d12' },
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
