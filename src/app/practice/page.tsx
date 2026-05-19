'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import { usePractice } from '@/hooks/usePractice'
import { useProgress } from '@/hooks/useProgress'
import { SentenceCard } from '@/components/practice/SentenceCard'
import { UnlockModal } from '@/components/practice/UnlockModal'
import { AnalysisSentence } from '@/components/practice/AnalysisSentence'
import { createClient } from '@/lib/supabase/client'
import type { CorpusWord, VocabWord } from '@/types'

function PracticeInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const startUnlock   = searchParams.get('unlock') === 'true'

  const { progress, settings, vocabCount, incrementSentence, resetRoundCounter, claimUnlock } = useProgress()
  const { state, fetchSentence, submitAnswer, togglePinyin, setAnswer } = usePractice(settings?.strictness ?? 2)

  const [showUnlock, setShowUnlock]               = useState(startUnlock)
  const [roundJustComplete, setRoundJustComplete] = useState(false)
  const [sentenceNum, setSentenceNum]             = useState(1)
  const [analysisMode, setAnalysisMode]           = useState(false)
  const [vocabList, setVocabList]                 = useState<VocabWord[]>([])

  const cardWrapRef = useRef<HTMLDivElement>(null)
  const contentRef  = useRef<HTMLDivElement>(null)

  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const wordsPerUnlock     = settings?.words_per_unlock ?? 5
  const currentHsk         = settings?.starting_hsk ?? 2

  useEffect(() => {
    if (!startUnlock) fetchSentence()
  }, []) // eslint-disable-line

  async function handleNext() {
    if (!cardWrapRef.current) { await fetchSentence(); return }

    setAnalysisMode(false)
    gsap.set(contentRef.current, { y: 0 })

    await gsap.to(cardWrapRef.current, {
      opacity: 0, x: -32, duration: 0.25, ease: 'power2.in'
    })
    gsap.set(cardWrapRef.current, { opacity: 1, x: 0 })

    let result
    try {
      result = await incrementSentence(state.grade?.score ?? 0)
    } catch {
      // don't let a tracking failure block the next sentence
    }

    if (result?.roundComplete && result.roundsCompleted % roundsBeforeUnlock === 0) {
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

  async function handleDone() {
    let result
    try { result = await incrementSentence(state.grade?.score ?? 0) } catch { /* don't block nav */ }
    if (result?.roundComplete && result.roundsCompleted % roundsBeforeUnlock === 0) {
      claimUnlock()
    }
    try {
      await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hsk_level: settings?.starting_hsk ?? 2,
          count: settings?.words_per_unlock ?? 5,
        }),
      })
    } catch { /* don't block nav */ }
    router.push('/dashboard')
  }

  function handleUnlockComplete(words: CorpusWord[]) {
    claimUnlock()
    setShowUnlock(false)
    setRoundJustComplete(false)
    setSentenceNum(1)
    resetRoundCounter()
    if (startUnlock) {
      router.push('/dashboard')
    } else {
      fetchSentence()
    }
  }

  async function enterAnalysis() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('vocab_list')
      .select('*')
      .eq('user_id', user.id)
    setVocabList(data ?? [])
    setAnalysisMode(true)

    if (contentRef.current) {
      gsap.to(contentRef.current, {
        y: 80,
        duration: 0.45,
        ease: 'power3.out',
      })
    }
  }

  function exitAnalysis() {
    setAnalysisMode(false)
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        y: 0,
        duration: 0.35,
        ease: 'power3.inOut',
      })
    }
  }

  const activeVocabZh: string[] = []

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">

      {/* Top nav */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm flex items-center gap-1.5 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ← Dashboard
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {vocabCount} words
          </span>
          <button
            onClick={() => router.push('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover-border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-tertiary)',
            }}
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <div ref={contentRef} className="flex-1 flex flex-col">
        {/* Sentence area */}
        <div ref={cardWrapRef} className="flex-1">
          {state.status === 'loading' && (
            <div className="animate-pulse">
              <div
                className="rounded-3xl p-6 mb-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="h-3 w-16 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="h-3 w-10 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                </div>
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="h-10 w-40 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="h-4 w-24 rounded-full opacity-60" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                </div>
              </div>
              <div
                className="rounded-3xl p-5"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <div className="h-3 w-32 rounded-full mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-12 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              </div>
            </div>
          )}

          {analysisMode && state.sentence && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Tap any character to inspect
                </span>
                <button
                  onClick={exitAnalysis}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
              <AnalysisSentence
                sentence={state.sentence}
                vocabList={vocabList}
              />
              {state.grade && (
                <div
                  className="mt-5 rounded-xl px-4 py-3"
                  style={{
                    opacity: 0.4,
                    background: state.grade.correct
                      ? 'rgba(5,150,105,0.12)'
                      : 'var(--error-bg)',
                    border: `0.5px solid ${state.grade.correct
                      ? 'rgba(5,150,105,0.4)'
                      : 'var(--error-border)'}`,
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: state.grade.correct ? '#059669' : 'var(--error-text)',
                    }}
                  >
                    {state.grade.correct ? '✓' : '✗'} {state.grade.score}/100
                  </span>
                </div>
              )}
            </div>
          )}

          {!analysisMode && state.sentence && state.status !== 'loading' && (
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

        {/* Next sentence / Done button */}
        {state.status === 'graded' && !analysisMode && (
          <div className="mt-6 slide-up">
            {sentenceNum === sentencesPerRound ? (
              <button
                onClick={handleDone}
                className="w-full active:scale-[0.98] font-medium rounded-2xl py-4 text-sm transition-all hover-accent"
                style={{ backgroundColor: 'var(--accent)', border: '1px solid var(--accent)', color: 'white' }}
              >
                Done! →
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full active:scale-[0.98] font-medium rounded-2xl py-4 text-sm transition-all hover-bg"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Next sentence →
              </button>
            )}

            <div className="mt-3">
              <button
                onClick={enterAnalysis}
                className="w-full rounded-2xl py-3 text-sm transition-all active:scale-[0.98] hover-bg hover-border"
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  color: 'var(--text-tertiary)',
                }}
              >
                Analyze sentence
              </button>
            </div>
          </div>
        )}
      </div>

      {showUnlock && (
        <UnlockModal
          wordsPerUnlock={wordsPerUnlock}
          currentHsk={currentHsk}
          activeVocab={activeVocabZh}
          onComplete={handleUnlockComplete}
          completeCta={startUnlock ? 'Back to Dashboard →' : 'Keep practicing →'}
        />
      )}
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-5 h-5 rounded-full animate-spin"
          style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <PracticeInner />
    </Suspense>
  )
}
