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
import { loadSavedTheme, applyTheme, THEMES, type ThemeId } from '@/lib/theme'
import { SessionSummary } from '@/components/practice/SessionSummary'
import { ReviewScreen }   from '@/components/practice/ReviewScreen'
import { StreakFlame }    from '@/components/practice/StreakFlame'
import type { CorpusWord, VocabWord, WrongAnswer, RoundSummary, SessionDraft } from '@/types'

const DRAFT_KEY = 'hanzi_session_draft'
const DRAFT_TTL = 24 * 60 * 60 * 1000

function saveDraft(draft: SessionDraft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch {}
}
function loadDraft(userId: string): SessionDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d: SessionDraft = JSON.parse(raw)
    if (d.userId !== userId || Date.now() - d.savedAt > DRAFT_TTL) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return d
  } catch { return null }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

function PracticeInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const startUnlock   = searchParams.get('unlock') === 'true'

  const { progress, settings, vocabCount, incrementSentence, finishRound, resetRoundCounter, claimUnlock } = useProgress()
  const { state, fetchSentence, submitAnswer, togglePinyin, setAnswer, restoreSentence } = usePractice(settings?.strictness ?? 2)

  const [showUnlock, setShowUnlock]               = useState(startUnlock)
  const [roundJustComplete, setRoundJustComplete] = useState(false)
  const [sentenceNum, setSentenceNum]             = useState(1)
  const [analysisMode, setAnalysisMode]           = useState(false)
  const [vocabList, setVocabList]                 = useState<VocabWord[]>([])
  const [theme, setTheme]                         = useState<ThemeId>('ink-jade')
  const [currentStreak, setCurrentStreak]         = useState(0)
  const [topStreak,     setTopStreak]             = useState(0)
  const [roundCorrect,  setRoundCorrect]          = useState(0)
  const [roundTotal,    setRoundTotal]            = useState(0)
  const [wrongAnswers,  setWrongAnswers]          = useState<WrongAnswer[]>([])
  const [roundSummary,  setRoundSummary]          = useState<RoundSummary | null>(null)
  const [showSummary,   setShowSummary]           = useState(false)
  const [showReview,    setShowReview]            = useState(false)

  const cardWrapRef    = useRef<HTMLDivElement>(null)
  const navigatingRef  = useRef(false)
  const userIdRef      = useRef<string | null>(null)

  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const wordsPerUnlock     = settings?.words_per_unlock ?? 5
  const currentHsk         = settings?.starting_hsk ?? 2

  useEffect(() => { setTheme(loadSavedTheme()) }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id
      const { data } = await supabase.from('vocab_list').select('*').eq('user_id', user.id)
      setVocabList(data ?? [])
      if (startUnlock) return
      const draft = loadDraft(user.id)
      if (draft) {
        setSentenceNum(draft.sentenceNum)
        setCurrentStreak(draft.currentStreak)
        setTopStreak(draft.topStreak)
        setRoundCorrect(draft.roundCorrect)
        setRoundTotal(draft.roundTotal)
        setWrongAnswers(draft.wrongAnswers)
        restoreSentence({
          sentence: draft.sentence,
          userAnswer: draft.userAnswer,
          grade: draft.grade,
          status: draft.status,
          pinyinMode: draft.pinyinMode,
        })
      } else {
        fetchSentence()
      }
    }
    init()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (state.status === 'graded' && state.grade) {
      if (state.grade.correct) {
        const next = currentStreak + 1
        setCurrentStreak(next)
        setTopStreak(prev => Math.max(prev, next))
        setRoundCorrect(prev => prev + 1)
      } else {
        setCurrentStreak(0)
        if (state.sentence) {
          setWrongAnswers(prev => [...prev, {
            sentence_zh:    state.sentence!.sentence_zh,
            sentence_py:    state.sentence!.sentence_py,
            user_answer:    state.userAnswer,
            correct_answer: state.grade!.correct_answer,
            vocab_used:     state.sentence!.vocab_used,
          }])
        }
      }
      setRoundTotal(prev => prev + 1)
    }
  }, [state.status, state.grade]) // eslint-disable-line

  useEffect(() => {
    if (!userIdRef.current || !state.sentence || state.status === 'loading' || state.status === 'submitted') return
    saveDraft({
      userId: userIdRef.current,
      savedAt: Date.now(),
      sentenceNum,
      currentStreak,
      topStreak,
      roundCorrect,
      roundTotal,
      wrongAnswers,
      sentence: state.sentence,
      userAnswer: state.userAnswer,
      grade: state.grade,
      status: state.status as 'ready' | 'graded',
      pinyinMode: state.pinyinMode,
    })
  }, [state, sentenceNum, currentStreak, topStreak, roundCorrect, roundTotal, wrongAnswers])

  function buildSummary(): RoundSummary {
    return {
      total:        roundTotal,
      correct:      roundCorrect,
      wrong:        roundTotal - roundCorrect,
      accuracy:     roundTotal > 0 ? Math.round((roundCorrect / roundTotal) * 100) : 0,
      wrongAnswers: [...wrongAnswers],
      topStreak,
    }
  }

  function resetRound() {
    setRoundCorrect(0)
    setRoundTotal(0)
    setWrongAnswers([])
    setTopStreak(0)
    setCurrentStreak(0)
    setSentenceNum(1)
  }

  async function goToDashboard() {
    if (navigatingRef.current) return
    navigatingRef.current = true
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hsk_level: settings?.starting_hsk ?? 2,
          count:     settings?.words_per_unlock ?? 5,
        }),
      })
      if (!res.ok) console.error('Word unlock failed:', res.status, await res.text())
    } catch (err) {
      console.error('Word unlock error:', err)
    } finally {
      navigatingRef.current = false
    }
    router.push('/dashboard')
  }

  async function handleNext() {
    // ── null-ref path: called from analysis mode (normal layout unmounted) ──
    if (!cardWrapRef.current) {
      let result
      try { result = await incrementSentence(state.grade?.score ?? 0) } catch { /* */ }
      if (result?.roundComplete) {
        const summary = buildSummary()
        setRoundSummary(summary)
        setShowSummary(true)
        finishRound({
          sentences_total:   summary.total,
          sentences_correct: summary.correct,
          accuracy_pct:      summary.accuracy,
          top_streak:        summary.topStreak,
          strictness:        settings?.strictness ?? 2,
          round_number:      progress?.current_round_number ?? 1,
        })
        clearDraft()
        resetRound()
        setAnalysisMode(false)
        return
      }
      setSentenceNum(prev => prev >= sentencesPerRound ? 1 : prev + 1)
      setAnalysisMode(false)
      await fetchSentence()
      return
    }

    // ── normal path ──────────────────────────────────────────────────────────
    await gsap.to(cardWrapRef.current, { opacity: 0, x: -32, duration: 0.25, ease: 'power2.in' })
    gsap.set(cardWrapRef.current, { opacity: 1, x: 0 })

    let result
    try { result = await incrementSentence(state.grade?.score ?? 0) } catch { /* */ }

    if (result?.roundComplete) {
      const summary = buildSummary()
      setRoundSummary(summary)
      setShowSummary(true)
      finishRound({
        sentences_total:   summary.total,
        sentences_correct: summary.correct,
        accuracy_pct:      summary.accuracy,
        top_streak:        summary.topStreak,
        strictness:        settings?.strictness ?? 2,
        round_number:      progress?.current_round_number ?? 1,
      })
      clearDraft()
      resetRound()
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
    claimUnlock()
    clearDraft()
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
  }

  function exitAnalysis() {
    setAnalysisMode(false)
  }

  function cycleTheme() {
    const ids = THEMES.map(t => t.id) as ThemeId[]
    const next = ids[(ids.indexOf(theme) + 1) % ids.length]
    applyTheme(next)
    setTheme(next)
  }

  function getDifficulty(vocabUsed: string[]): {
    label: string; color: string; bg: string; border: string
  } {
    if (!vocabUsed.length || !vocabList.length) {
      return { label: 'New', color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', border: 'var(--border)' }
    }
    const scores = vocabUsed.map(zh => {
      const w = vocabList.find(v => v.word_zh === zh)
      if (!w || w.times_seen === 0) return 50
      return Math.round((w.times_correct / w.times_seen) * 100)
    })
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg >= 80) return { label: 'Easy', color: 'var(--accent-text)', bg: 'var(--accent-subtle)', border: 'var(--accent)' }
    if (avg >= 50) return { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' }
    return { label: 'Hard', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' }
  }

  const activeVocabZh: string[] = []

  // ── Analysis mode — full-screen takeover ───────────────────────────
  if (analysisMode && state.sentence) {
    return (
      <div className="flex flex-col min-h-screen px-4 py-8 max-w-lg mx-auto">

        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={exitAnalysis}
            className="text-sm flex items-center gap-1.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ← Back to practice
          </button>
          <button
            onClick={exitAnalysis}
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Tap any character to inspect
        </p>

        {/* Annotated sentence — mt-16 keeps tooltip above the viewport top */}
        <div className="mt-16 mb-8">
          <AnalysisSentence
            sentence={state.sentence}
            vocabList={vocabList}
          />
        </div>

        {/* Words in this sentence */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Words in this sentence
          </p>
          <div className="space-y-2">
            {state.sentence.vocab_used.map(zh => {
              const word = vocabList.find(w => w.word_zh === zh)
              if (!word) return null
              const acc = word.times_seen > 0
                ? Math.round((word.times_correct / word.times_seen) * 100)
                : null
              return (
                <div key={zh} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-hanzi text-lg" style={{ color: 'var(--text-primary)' }}>
                      {word.word_zh}
                    </span>
                    <div>
                      <span className="text-xs" style={{ color: 'var(--accent-text)' }}>
                        {word.pinyin}
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                        {word.english}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {acc !== null && (
                      <span
                        className="text-xs"
                        style={{
                          color: acc >= 70 ? 'var(--accent-text)' : acc >= 40 ? '#fbbf24' : '#f87171',
                        }}
                      >
                        {acc}%
                      </span>
                    )}
                    <span
                      className="text-xs capitalize px-2 py-0.5 rounded-lg"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-tertiary)',
                        border: '0.5px solid var(--border)',
                      }}
                    >
                      {word.pos}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Next sentence */}
        <button
          onClick={() => { exitAnalysis(); handleNext() }}
          className="w-full rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98] mt-auto hover-accent"
          style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
        >
          Next sentence →
        </button>

      </div>
    )
  }

  // ── Normal practice mode ───────────────────────────────────────────
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

          <StreakFlame streak={currentStreak} />

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

          <button
            onClick={cycleTheme}
            aria-label="Switch theme"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)',
              color: 'var(--text-tertiary)',
              fontSize: '14px',
            }}
          >
            ◐
          </button>
        </div>
      </div>

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
            difficulty={getDifficulty(state.sentence.vocab_used)}
          />
        )}
      </div>

      {/* Next sentence / Done button */}
      {state.status === 'graded' && (
        <div className="mt-6 slide-up">
          {sentenceNum === sentencesPerRound ? (
            <button
              onClick={handleNext}
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

      {showUnlock && (
        <UnlockModal
          wordsPerUnlock={wordsPerUnlock}
          currentHsk={currentHsk}
          activeVocab={activeVocabZh}
          onComplete={handleUnlockComplete}
          completeCta={startUnlock ? 'Back to Dashboard →' : 'Keep practicing →'}
        />
      )}

      {showSummary && roundSummary && (
        <SessionSummary
          summary={roundSummary}
          onReview={() => { setShowSummary(false); setShowReview(true) }}
          onDashboard={goToDashboard}
        />
      )}

      {showReview && roundSummary && (
        <ReviewScreen
          wrongAnswers={roundSummary.wrongAnswers}
          onDone={goToDashboard}
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
