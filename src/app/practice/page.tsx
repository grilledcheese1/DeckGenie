'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import { usePractice } from '@/hooks/usePractice'
import { useProgress } from '@/hooks/useProgress'
import { SentenceCard } from '@/components/practice/SentenceCard'
import { UnlockModal } from '@/components/practice/UnlockModal'
import type { CorpusWord } from '@/types'

function PracticeInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const startUnlock   = searchParams.get('unlock') === 'true'

  const { progress, settings, vocabCount, incrementSentence, resetRoundCounter } = useProgress()
  const { state, fetchSentence, submitAnswer, togglePinyin, setAnswer } = usePractice(settings?.strictness ?? 2)

  const [showUnlock, setShowUnlock]         = useState(startUnlock)
  const [roundJustComplete, setRoundJustComplete] = useState(false)
  const [sentenceNum, setSentenceNum]       = useState(1)
  const cardWrapRef = useRef<HTMLDivElement>(null)

  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const wordsPerUnlock     = settings?.words_per_unlock ?? 5
  const currentHsk         = settings?.starting_hsk ?? 2

  // Fetch first sentence on mount (skip if opening unlock flow directly)
  useEffect(() => {
    if (!startUnlock) fetchSentence()
  }, []) // eslint-disable-line

  // Slide out current card then fetch next
  async function handleNext() {
    if (!cardWrapRef.current) { await fetchSentence(); return }

    await gsap.to(cardWrapRef.current, {
      opacity: 0, x: -32, duration: 0.25, ease: 'power2.in'
    })

    let result
    try {
      result = await incrementSentence(state.grade?.correct ?? false)
    } catch {
      // don't let a tracking failure block the next sentence
    }

    // Check if we just hit the unlock threshold
    if (
      result?.roundComplete &&
      result.roundsCompleted % roundsBeforeUnlock === 0
    ) {
      setRoundJustComplete(true)
      setShowUnlock(true)
      setSentenceNum(1)
      gsap.set(cardWrapRef.current, { opacity: 1, x: 0 })
      return
    }

    setSentenceNum(prev => prev >= sentencesPerRound ? 1 : prev + 1)
    await fetchSentence()
    gsap.fromTo(cardWrapRef.current,
      { opacity: 0, x: 32 },
      { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
    )
  }

  function handleUnlockComplete(words: CorpusWord[]) {
    setShowUnlock(false)
    setRoundJustComplete(false)
    setSentenceNum(1)
    resetRoundCounter()
    fetchSentence()
  }

  // Active vocab zh list for unlock exclusion
  const activeVocabZh: string[] = [] // populated from supabase in real use; passed via UnlockModal

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">

      {/* Top nav */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-stone-600 hover:text-stone-300 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Dashboard
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-600">
            {vocabCount} words
          </span>
          <button
            onClick={() => router.push('/settings')}
            className="w-8 h-8 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors"
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Sentence area */}
      <div ref={cardWrapRef} className="flex-1">
        {state.status === 'loading' && (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        )}

        {state.sentence && state.status !== 'loading' && (
          <SentenceCard
            sentence={state.sentence}
            pinyinMode={state.pinyinMode}
            showPinyinSetting={settings?.show_pinyin ?? 'tap'}
            onTogglePinyin={togglePinyin}
            userAnswer={state.userAnswer}
            onAnswerChange={setAnswer}
            onSubmit={submitAnswer}
            grade={state.grade}
            status={state.status}
            showHints={settings?.show_hints ?? 'after'}
            sentenceNumber={sentenceNum}
            totalSentences={sentencesPerRound}
          />
        )}
      </div>

      {/* Next sentence button — shown after grading */}
      {state.status === 'graded' && (
        <div className="mt-6 slide-up">
          <button
            onClick={handleNext}
            className="w-full bg-stone-900 hover:bg-stone-800 border border-stone-800 active:scale-[0.98] text-stone-200 font-medium rounded-2xl py-4 text-sm transition-all"
          >
            Next sentence →
          </button>
        </div>
      )}

      {/* Unlock modal */}
      {showUnlock && (
        <UnlockModal
          wordsPerUnlock={wordsPerUnlock}
          currentHsk={currentHsk}
          activeVocab={activeVocabZh}
          onComplete={handleUnlockComplete}
        />
      )}
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <PracticeInner />
    </Suspense>
  )
}
