'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { GenerateResponse, GradeResponse } from '@/types'

function SpeakerButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false)

  async function speak() {
    setSpeaking(true)
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  return (
    <button
      onClick={speak}
      disabled={speaking}
      aria-label="Listen to pronunciation"
      className="flex-shrink-0 mt-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
      style={{
        background: speaking ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
        border: `0.5px solid ${speaking ? 'var(--accent)' : 'var(--border)'}`,
        color: speaking ? 'var(--accent-text)' : 'var(--text-tertiary)',
      }}
    >
      {speaking ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      )}
    </button>
  )
}

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
  difficulty?: { label: string; color: string; bg: string; border: string }
}

export function SentenceCard({
  sentence, pinyinMode, showPinyinSetting, onTogglePinyin,
  userAnswer, onAnswerChange, onSubmit, grade, status,
  showHints, sentenceNumber, totalSentences, difficulty,
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
        className="w-full rounded-full mb-6 overflow-hidden"
        style={{ height: '6px', background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(sentenceNumber / totalSentences) * 100}%`,
            background: 'var(--accent)',
          }}
        />
      </div>

      {/* Sentence number + difficulty badge */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {sentenceNumber} / {totalSentences}
        </p>
        {difficulty && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-lg"
            style={{
              color: difficulty.color,
              background: difficulty.bg,
              border: `0.5px solid ${difficulty.border}`,
            }}
          >
            {difficulty.label}
          </span>
        )}
      </div>

      {/* Hanzi + speaker button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p
          className="font-hanzi leading-tight tracking-wide flex-1"
          style={{
            fontSize: 'clamp(2rem, 8vw, 3.2rem)',
            color: 'var(--text-primary)',
            lineHeight: 1.25,
          }}
        >
          {sentence.sentence_zh}
        </p>
        <SpeakerButton text={sentence.sentence_zh} />
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
          <p
            className="text-xs text-right hidden sm:block"
            style={{ color: 'var(--text-tertiary)', marginTop: '-4px' }}
          >
            ↵ Enter to submit
          </p>
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
