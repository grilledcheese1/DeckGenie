'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { GenerateResponse, GradeResponse } from '@/types'

interface Props {
  sentence: GenerateResponse
  pinyinMode: 'showing' | 'hidden'
  showPinyinSetting: 'always' | 'tap' | 'never'
  onTogglePinyin: () => void
  userAnswer: string
  onAnswerChange: (v: string) => void
  onSubmit: () => void
  grade: GradeResponse | null
  status: 'loading' | 'ready' | 'submitted' | 'graded'
  showHints: 'before' | 'after' | 'never'
  sentenceNumber: number
  totalSentences: number
}

export function SentenceCard({
  sentence, pinyinMode, showPinyinSetting, onTogglePinyin,
  userAnswer, onAnswerChange, onSubmit, grade, status,
  showHints, sentenceNumber, totalSentences,
}: Props) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const gradeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
    )
  }, [sentence.sentence_zh])

  useEffect(() => {
    if (status !== 'graded' || !gradeRef.current) return
    gsap.fromTo(gradeRef.current,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.4)' }
    )
  }, [status])

  const pinyinVisible =
    showPinyinSetting === 'always' ||
    (showPinyinSetting === 'tap' && pinyinMode === 'showing')

  const showHintChips =
    showHints === 'before' ||
    (showHints === 'after' && status === 'graded')

  const isSubmitting = status === 'submitted'

  return (
    <div ref={cardRef} className="w-full">

      {/* Progress bar */}
      <div
        className="w-full h-0.5 rounded-full mb-6 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(sentenceNumber / totalSentences) * 100}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>

      {/* Sentence number */}
      <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
        {sentenceNumber} / {totalSentences}
      </p>

      {/* Hanzi */}
      <div className="mb-3">
        <p className="font-hanzi text-4xl leading-tight tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {sentence.sentence_zh}
        </p>
      </div>

      {/* Pinyin */}
      {showPinyinSetting !== 'never' && (
        <div className="mb-6 min-h-[24px]">
          {pinyinVisible ? (
            <p className="text-sm pinyin-reveal" style={{ color: 'var(--text-secondary)' }}>
              {sentence.sentence_py}
            </p>
          ) : (
            <button
              onClick={onTogglePinyin}
              className="text-xs rounded-lg px-3 py-1 transition-all hover-border"
              style={{
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              Show pinyin
            </button>
          )}
        </div>
      )}

      {/* Vocab hint chips */}
      {showHintChips && sentence.vocab_used.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {sentence.vocab_used.map(zh => (
            <span
              key={zh}
              className="text-xs rounded-lg px-2.5 py-1 font-hanzi"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {zh}
            </span>
          ))}
        </div>
      )}

      {/* Answer input */}
      {status !== 'graded' && (
        <div className="space-y-3">
          <textarea
            value={userAnswer}
            onChange={e => onAnswerChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && userAnswer.trim()) {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder="Type your English translation…"
            rows={2}
            disabled={isSubmitting}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none disabled:opacity-50 transition-all focus:outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
          />
          <button
            onClick={onSubmit}
            disabled={!userAnswer.trim() || isSubmitting}
            className="w-full disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] font-medium rounded-xl py-3 text-sm transition-all hover-accent"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{ border: '2px solid white', borderTopColor: 'transparent' }}
                />
                Grading…
              </span>
            ) : 'Submit'}
          </button>
        </div>
      )}

      {/* Grade result */}
      {status === 'graded' && grade && (
        <div ref={gradeRef} className="space-y-3">
          <div
            className="rounded-xl px-4 py-3"
            style={grade.correct ? {
              backgroundColor: 'rgba(5,150,105,0.12)',
              border: '1px solid rgba(5,150,105,0.4)',
            } : {
              backgroundColor: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm font-medium"
                style={{ color: grade.correct ? '#059669' : 'var(--error-text)' }}
              >
                {grade.correct ? '✓ Correct' : '✗ Incorrect'} · {grade.score}/100
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{grade.feedback}</p>
          </div>

          {!grade.correct && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Correct answer</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{grade.correct_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
