'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { RoundSummary } from '@/types'

interface Props {
  summary:     RoundSummary
  onReview:    () => void
  onDashboard: () => void
}

export function SessionSummary({ summary, onReview, onDashboard }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { y: '-100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.55, ease: 'power3.out' }
      )
      gsap.fromTo(
        '.summary-card',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.35 }
      )
    })
    return () => ctx.revert()
  }, [])

  const accuracyColor =
    summary.accuracy >= 80 ? 'var(--accent-text)'
    : summary.accuracy >= 50 ? '#fbbf24'
    : '#f87171'

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-summary-title"
      className="fixed inset-0 z-50 flex flex-col px-4 py-8 max-w-lg mx-auto overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div className="mb-10 mt-4">
        <p id="session-summary-title" className="font-hanzi text-3xl mb-1" style={{ color: 'var(--hanzi-color)' }}>
          轮次完成
        </p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Round complete
        </p>
      </div>

      {/* Accuracy hero */}
      <div
        className="summary-card rounded-3xl p-6 mb-4 text-center"
        style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
      >
        <p
          className="font-medium mb-1"
          style={{ fontSize: 'clamp(3rem, 15vw, 5rem)', color: accuracyColor, lineHeight: 1 }}
        >
          {summary.accuracy}%
        </p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          accuracy this round
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Correct',    value: summary.correct,   color: 'var(--accent-text)' },
          { label: 'Wrong',      value: summary.wrong,     color: summary.wrong > 0 ? '#f87171' : 'var(--text-primary)' },
          { label: 'Top streak', value: summary.topStreak, color: summary.topStreak >= 5 ? '#fbbf24' : 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="summary-card rounded-2xl p-4"
            style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
          >
            <p className="text-2xl font-medium mb-0.5" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Wrong answers preview — up to 3 */}
      {summary.wrongAnswers.length > 0 && (
        <div
          className="summary-card rounded-2xl p-4 mb-6"
          style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Missed sentences
          </p>
          <div className="space-y-3">
            {summary.wrongAnswers.slice(0, 3).map((w, i) => (
              <div
                key={i}
                className="pb-3"
                style={{
                  borderBottom: i < Math.min(summary.wrongAnswers.length, 3) - 1
                    ? '0.5px solid var(--border)'
                    : 'none',
                }}
              >
                <p className="font-hanzi text-lg mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {w.sentence_zh}
                </p>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {w.sentence_py}
                </p>
                <p className="text-xs" style={{ color: '#f87171' }}>
                  You: &quot;{w.user_answer}&quot;
                </p>
                <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
                  ✓ {w.correct_answer}
                </p>
              </div>
            ))}
            {summary.wrongAnswers.length > 3 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                +{summary.wrongAnswers.length - 3} more in full review
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="space-y-3">
        {summary.wrongAnswers.length > 0 && (
          <button
            onClick={onReview}
            className="w-full rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98] hover-bg"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Review {summary.wrongAnswers.length} wrong answer{summary.wrongAnswers.length !== 1 ? 's' : ''} →
          </button>
        )}
        <button
          onClick={onDashboard}
          className="w-full rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98] hover-accent"
          style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  )
}
