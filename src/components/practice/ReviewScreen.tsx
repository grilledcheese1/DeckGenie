'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { WrongAnswer } from '@/types'

interface Props {
  wrongAnswers: WrongAnswer[]
  onDone:       () => void
}

export function ReviewScreen({ wrongAnswers, onDone }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const isExitingRef  = useRef(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { x: '100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.4, ease: 'power3.out' }
      )
      gsap.fromTo(
        '.review-item',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', delay: 0.2 }
      )
    })
    return () => ctx.revert()
  }, [])

  function handleDone() {
    if (isExitingRef.current) return
    isExitingRef.current = true
    gsap.killTweensOf(containerRef.current)
    gsap.to(containerRef.current, {
      x: '100%',
      opacity: 0,
      duration: 0.32,
      ease: 'power3.in',
      onComplete: onDone,
    })
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col px-4 py-8 overflow-y-auto max-w-lg mx-auto"
      style={{ background: 'var(--bg-primary)', zIndex: 60 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Wrong answers
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {wrongAnswers.length} sentence{wrongAnswers.length !== 1 ? 's' : ''} to review
          </p>
        </div>
        <button
          onClick={handleDone}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Done
        </button>
      </div>

      {/* Wrong answer cards */}
      <div className="space-y-4 flex-1">
        {wrongAnswers.map((item, i) => (
          <div
            key={i}
            className="review-item rounded-2xl p-5"
            style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
          >
            <p
              className="font-hanzi mb-1"
              style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--text-primary)', lineHeight: 1.3 }}
            >
              {item.sentence_zh}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
              {item.sentence_py}
            </p>

            <div className="mb-4" style={{ height: '0.5px', background: 'var(--border)' }} />

            <div className="mb-3">
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Your answer
              </p>
              <p
                className="text-sm px-3 py-2 rounded-xl"
                style={{
                  color: '#f87171',
                  background: 'rgba(248,113,113,0.08)',
                  border: '0.5px solid rgba(248,113,113,0.2)',
                }}
              >
                {item.user_answer || '(no answer)'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Correct answer
              </p>
              <p
                className="text-sm px-3 py-2 rounded-xl"
                style={{
                  color: 'var(--accent-text)',
                  background: 'var(--accent-subtle)',
                  border: '0.5px solid var(--accent)',
                }}
              >
                {item.correct_answer}
              </p>
            </div>

            {item.vocab_used.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.vocab_used.map(zh => (
                  <span
                    key={zh}
                    className="text-xs px-2 py-0.5 rounded-lg font-hanzi"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-tertiary)',
                      border: '0.5px solid var(--border)',
                    }}
                  >
                    {zh}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleDone}
        className="w-full rounded-2xl py-4 text-sm font-medium mt-6 transition-all active:scale-[0.98] hover-accent"
        style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
      >
        Done — back to dashboard
      </button>
    </div>
  )
}
