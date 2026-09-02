'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { GenerateResponse, GradeResponse } from '@/types'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { segmentSentence } from '@/lib/chinese'

type SpeechState = 'idle' | 'normal' | 'slow'

/**
 * `speak()` is the single fetch-and-play implementation, parameterized by
 * `playbackRate` — both the normal-speed and slow-speed buttons call it
 * with a different rate rather than duplicating the fetch/blob/Audio setup.
 *
 * The fetched blob is cached in `cacheRef`, keyed on the sentence text it
 * was fetched for. A click only hits `/api/speak` when no cached blob
 * exists yet for the current sentence (i.e. the first play at either
 * speed) — a second click at the other speed for the same sentence reuses
 * the cached object URL and just plays a new `Audio` at the requested
 * `playbackRate`, no network request. The cache is invalidated (and its
 * object URL revoked) whenever `text` changes, via the effect below, so a
 * new sentence always re-fetches rather than playing stale audio.
 */
export function SpeakerButton({ text }: { text: string }) {
  const [speechState, setSpeechState] = useState<SpeechState>('idle')
  const cacheRef = useRef<{ text: string; url: string } | null>(null)

  // Invalidate the cached blob whenever the sentence changes, and on
  // unmount — revokes the previous sentence's object URL so it doesn't
  // leak, and guarantees the next play() for a new sentence re-fetches
  // instead of reusing stale audio.
  useEffect(() => {
    return () => {
      if (cacheRef.current) {
        URL.revokeObjectURL(cacheRef.current.url)
        cacheRef.current = null
      }
    }
  }, [text])

  async function getAudioUrl(): Promise<string> {
    if (cacheRef.current && cacheRef.current.text === text) {
      return cacheRef.current.url
    }
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('TTS failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    cacheRef.current = { text, url }
    return url
  }

  async function speak(rate: number, which: SpeechState) {
    setSpeechState(which)
    try {
      const url = await getAudioUrl()
      const audio = new Audio(url)
      audio.playbackRate = rate
      audio.onended = () => setSpeechState('idle')
      audio.onerror = () => setSpeechState('idle')
      await audio.play()
    } catch {
      setSpeechState('idle')
    }
  }

  const busy = speechState !== 'idle'

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
      <button
        onClick={() => speak(1, 'normal')}
        disabled={busy}
        aria-label="Listen to pronunciation"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
        style={{
          background: speechState === 'normal' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
          border: `0.5px solid ${speechState === 'normal' ? 'var(--accent)' : 'var(--border)'}`,
          color: speechState === 'normal' ? 'var(--accent-text)' : 'var(--text-tertiary)',
        }}
      >
        {speechState === 'normal' ? (
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

      <button
        onClick={() => speak(0.6, 'slow')}
        disabled={busy}
        aria-label="Listen slowly"
        title="Slow playback"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
        style={{
          background: speechState === 'slow' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
          border: `0.5px solid ${speechState === 'slow' ? 'var(--accent)' : 'var(--border)'}`,
          color: speechState === 'slow' ? 'var(--accent-text)' : 'var(--text-tertiary)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8c-3 0-5.5 2-6.5 4.5C4.5 14 3 14 3 15.5S4.5 18 6 17c1 1.5 3 2 6 2s5-.5 6-2c1.5 1 3 .5 3-1S19.5 14 18.5 12.5C17.5 10 15 8 12 8Z" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M7 12H4M20 12h-3M9 18l-1.5 2M15 18l1.5 2" />
          <circle cx="9.5" cy="12.5" r="0.5" fill="currentColor" />
        </svg>
      </button>
    </div>
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
  onSkip: () => void
  grade: GradeResponse | null
  status: 'loading' | 'ready' | 'submitted' | 'graded'
  showHints: 'before' | 'after' | 'never'
  sentenceNumber: number
  totalSentences: number
  difficulty?: { label: string; color: string; bg: string; border: string }
}

export function SentenceCard({
  sentence, pinyinMode, showPinyinSetting, onTogglePinyin,
  userAnswer, onAnswerChange, onSubmit, onSkip, grade, status,
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

  // Full sentence segmentation (not just `vocab_used`, which only covers
  // tracked words) so the tile row always reflects every character/word in
  // the actual sentence being shown. Punctuation-only segments are dropped.
  const sentenceTiles = segmentSentence(sentence.sentence_zh, sentence.vocab_used)
    .filter(seg => /\p{Script=Han}/u.test(seg))

  const isSubmitting = status === 'submitted'

  return (
    <div ref={cardRef} className="w-full">

      {/* Progress bar — thicker at xl+, unchanged below that */}
      <div className="mb-6">
        <ProgressBar
          value={sentenceNumber}
          max={totalSentences}
          aria-label="Round progress"
          className="xl:h-2.5"
        />
      </div>

      {/* Sentence card — bordered/padded container only at xl+ (matches the
          reference desktop layout's card around round/badge/hanzi/pinyin).
          Below xl this wrapper renders with no border/background/padding of
          its own, so the mobile layout is byte-identical to before this
          change — only classes that resolve to nothing below the `xl:`
          breakpoint were added here. */}
      <div className="xl:rounded-3xl xl:border xl:p-8 xl:mb-6 xl:bg-[var(--bg-secondary)] xl:border-[var(--border)]">

        {/* Sentence number + difficulty badge */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {sentenceNumber} / {totalSentences}
          </p>
          {difficulty && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-lg inline-flex items-center gap-1"
              style={{
                color: difficulty.color,
                background: difficulty.bg,
                border: `0.5px solid ${difficulty.border}`,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 21c8 0 14-6 14-14V5h-2C9 5 5 11 5 19v2Z" />
                <path d="M5 21c2.5-4 6-7 10.5-9" />
              </svg>
              {difficulty.label}
            </span>
          )}
        </div>

        {/* Hanzi + pinyin, centered against the FULL card width — the
            speaker/turtle column is positioned absolutely (not a flex
            sibling) so it doesn't eat width from one side and throw the
            centering off. Vertically centered against the combined
            hanzi+pinyin block via top-1/2/-translate-y-1/2 on the relative
            parent below. Larger hanzi at xl+ via a Tailwind class (not
            inline style) so the xl: breakpoint variant can win; inline
            style would otherwise always beat a class regardless of
            breakpoint. */}
        <div className="relative mb-6">
          <div className="text-center px-12">
            <p
              className="font-hanzi leading-tight tracking-wide text-[clamp(2rem,8vw,3.2rem)] xl:text-[3.75rem]"
              style={{
                color: 'var(--text-primary)',
                lineHeight: 1.25,
              }}
            >
              {sentence.sentence_zh}
            </p>

            {showPinyinSetting !== 'never' && (
              <div className="mt-3 min-h-[24px]">
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
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <SpeakerButton text={sentence.sentence_zh} />
          </div>
        </div>
      </div>

      {/* Sentence word/character tiles — full segmentation of the actual
          sentence, gated by the same show_hints setting as before. */}
      {showHintChips && sentenceTiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {sentenceTiles.map((zh, i) => (
            <span
              key={`${zh}-${i}`}
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
          <Button
            variant="primary"
            icon="ink"
            className="w-full"
            onClick={onSubmit}
            disabled={!userAnswer.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{ border: '2px solid white', borderTopColor: 'transparent' }}
                />
                Grading…
              </span>
            ) : 'Submit'}
          </Button>

          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full text-center text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-80"
            style={{ color: 'var(--accent-text)' }}
          >
            Skip this question →
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
