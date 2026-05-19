'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { VocabCard } from './VocabCard'
import type { VocabWord } from '@/types'

interface Props {
  words: VocabWord[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export function VocabSlideView({ words, loading, hasMore, onLoadMore }: Props) {
  const [index, setIndex] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setIndex(0) }, [words])

  useEffect(() => {
    if (hasMore && !loading && words.length > 0 && index >= words.length - 5) {
      onLoadMore()
    }
  }, [index, words.length, hasMore, loading, onLoadMore])

  function navigate(direction: 'next' | 'prev') {
    const nextIndex = direction === 'next' ? index + 1 : index - 1
    if (nextIndex < 0 || nextIndex >= words.length) return

    const xOut = direction === 'next' ? -60 : 60
    const xIn  = direction === 'next' ?  60 : -60

    gsap.to(cardRef.current, {
      x: xOut, opacity: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        setIndex(nextIndex)
        gsap.fromTo(cardRef.current,
          { x: xIn,  opacity: 0 },
          { x: 0,    opacity: 1, duration: 0.25, ease: 'power2.out' }
        )
      },
    })
  }

  if (words.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm gap-1" style={{ color: 'var(--text-tertiary)' }}>
        <p>No words found</p>
        <p className="text-xs">Try adjusting your filters</p>
      </div>
    )
  }

  const word = words[index]

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Progress */}
      <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {index + 1} / {words.length}{hasMore ? '+' : ''}
        </span>
        {word && (
          <span className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{word.pos}</span>
        )}
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="flex-1 mx-5 mb-4 rounded-3xl p-6 relative min-h-0"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {word && <VocabCard key={word.id} word={word} />}
        {loading && index >= words.length - 1 && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-3xl"
            style={{ backgroundColor: 'var(--bg-secondary)', opacity: 0.8 }}
          >
            <div
              className="w-4 h-4 rounded-full animate-spin"
              style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 px-5 pb-5 flex-shrink-0">
        <button
          onClick={() => navigate('prev')}
          disabled={index === 0}
          className="flex-1 py-3 rounded-2xl text-sm disabled:opacity-30 active:scale-[0.97] transition-all hover-border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          ← Prev
        </button>
        <button
          onClick={() => navigate('next')}
          disabled={index >= words.length - 1 && !hasMore}
          className="flex-1 py-3 rounded-2xl text-sm disabled:opacity-30 active:scale-[0.97] transition-all hover-border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
