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

  // Slide-up entrance on each new sentence
  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
    )
  }, [sentence.sentence_zh])

  // Grade pop-in
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
      <div className="w-full h-0.5 bg-stone-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
          style={{ width: `${(sentenceNumber / totalSentences) * 100}%` }}
        />
      </div>

      {/* Sentence number */}
      <p className="text-xs text-stone-600 mb-5">{sentenceNumber} / {totalSentences}</p>

      {/* Hanzi */}
      <div className="mb-3">
        <p className="font-hanzi text-4xl leading-tight text-stone-100 tracking-wide">
          {sentence.sentence_zh}
        </p>
      </div>

      {/* Pinyin — tap to reveal */}
      {showPinyinSetting !== 'never' && (
        <div className="mb-6 min-h-[24px]">
          {pinyinVisible ? (
            <p className="text-stone-400 text-sm pinyin-reveal">
              {sentence.sentence_py}
            </p>
          ) : (
            <button
              onClick={onTogglePinyin}
              className="text-xs text-stone-700 hover:text-stone-500 border border-stone-800 hover:border-stone-700 rounded-lg px-3 py-1 transition-all"
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
              className="text-xs bg-stone-900 border border-stone-800 text-stone-400 rounded-lg px-2.5 py-1 font-hanzi"
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
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-700 resize-none disabled:opacity-50 transition-all"
          />
          <button
            onClick={onSubmit}
            disabled={!userAnswer.trim() || isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-white font-medium rounded-xl py-3 text-sm transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Grading…
              </span>
            ) : 'Submit'}
          </button>
        </div>
      )}

      {/* Grade result */}
      {status === 'graded' && grade && (
        <div ref={gradeRef} className="space-y-3">
          {/* Score banner */}
          <div className={`rounded-xl px-4 py-3 border ${
            grade.correct
              ? 'bg-emerald-950/50 border-emerald-800/60'
              : 'bg-red-950/30 border-red-900/40'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${grade.correct ? 'text-emerald-300' : 'text-red-400'}`}>
                {grade.correct ? '✓ Correct' : '✗ Incorrect'} · {grade.score}/100
              </span>
            </div>
            <p className="text-xs text-stone-400">{grade.feedback}</p>
          </div>

          {/* Correct answer */}
          {!grade.correct && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
              <p className="text-xs text-stone-600 mb-1">Correct answer</p>
              <p className="text-sm text-stone-200">{grade.correct_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
