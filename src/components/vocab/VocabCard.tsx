'use client'

import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'

const HSK_BADGE: Record<number, string> = {
  1: 'text-emerald-400 bg-emerald-950 border-emerald-900',
  2: 'text-sky-400 bg-sky-950 border-sky-900',
  3: 'text-violet-400 bg-violet-950 border-violet-900',
  4: 'text-amber-400 bg-amber-950 border-amber-900',
  5: 'text-rose-400 bg-rose-950 border-rose-900',
  6: 'text-orange-400 bg-orange-950 border-orange-900',
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

  return (
    <div
      onClick={handleTap}
      className="relative w-full h-full flex flex-col items-center justify-center select-none cursor-pointer"
    >
      {/* HSK badge */}
      <span className={`absolute top-0 left-0 text-xs font-medium border rounded-lg px-1.5 py-0.5 ${HSK_BADGE[word.hsk_level]}`}>
        HSK {word.hsk_level}
      </span>

      {/* Accuracy dot */}
      {accuracy !== null && (
        <div className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
          accuracy >= 0.8 ? 'bg-emerald-500' : accuracy >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
        }`} />
      )}

      {/* Hanzi — revealed only */}
      {revealed && (
        <p ref={hanziRef} className="font-hanzi text-6xl text-stone-100 mb-4 leading-none">
          {word.word_zh}
        </p>
      )}

      {/* Pinyin — always visible */}
      <p className="text-2xl text-stone-300 tracking-wide">{word.pinyin}</p>

      {/* English — revealed only */}
      {revealed && (
        <p ref={englishRef} className="text-sm text-stone-400 mt-3 text-center leading-snug max-w-[80%]">
          {word.english}
        </p>
      )}

      {/* Tap hint */}
      {!revealed && (
        <p className="absolute bottom-0 text-xs text-stone-700">tap to reveal</p>
      )}
    </div>
  )
}
