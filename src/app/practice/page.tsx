'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { usePractice } from '@/hooks/usePractice'
import { useProgress } from '@/hooks/useProgress'
import { SentenceCard, SpeakerButton } from '@/components/practice/SentenceCard'
import { UnlockModal } from '@/components/practice/UnlockModal'
import { AnalysisSentence } from '@/components/practice/AnalysisSentence'
import { AppShell } from '@/components/shell/AppShell'
import { PracticeRightRail } from '@/components/practice/PracticeRightRail'
import { AnalysisRightRail } from '@/components/practice/AnalysisRightRail'
import { SentenceBreakdownCard } from '@/components/practice/SentenceBreakdownCard'
import { GrammarFocusCard } from '@/components/practice/GrammarFocusCard'
import { TipsCard } from '@/components/practice/TipsCard'
import { ScoreRing } from '@/components/practice/ScoreRing'
import { Badge, getWordStatus, getStatusColor, type StatusTag } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { getApiKey } from '@/lib/byoKey'
import { loadSavedTheme, applyTheme, THEMES, type ThemeId } from '@/lib/theme'
import { SessionSummary } from '@/components/practice/SessionSummary'
import { ReviewScreen }   from '@/components/practice/ReviewScreen'
import { StreakFlame }    from '@/components/practice/StreakFlame'
import type { CorpusWord, VocabWord, WrongAnswer, RoundSummary, SessionDraft, Settings } from '@/types'

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
    if (typeof d.userId !== 'string' || !d.userId || !isFinite(d.savedAt)) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    if (d.userId !== userId || Date.now() - d.savedAt > DRAFT_TTL) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    if (typeof d.sentence?.sentence_id !== 'string' || !d.sentence.sentence_id) {
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

  const { progress, settings, vocabCount, incrementSentence, finishRound, resetRoundCounter, claimUnlock, canUnlock } = useProgress()
  const { state, fetchSentence, submitAnswer, togglePinyin, setAnswer, restoreSentence } = usePractice(settings?.strictness ?? 2, settings?.practice_mode ?? 'static')

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

  const cardWrapRef      = useRef<HTMLDivElement>(null)
  const userIdRef        = useRef<string | null>(null)
  const clearedDraftRef  = useRef(false)
  const initedRef        = useRef(false)
  const lastModeRef      = useRef<Settings['practice_mode'] | null>(null)

  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const wordsPerUnlock     = settings?.words_per_unlock ?? 5
  const currentHsk         = settings?.starting_hsk ?? 2

  useEffect(() => { setTheme(loadSavedTheme()) }, [])

  useEffect(() => {
    // Gated on settings (rather than firing unconditionally on mount) so the
    // ai-mode-no-key check below reads the real practice_mode instead of
    // usePractice's 'static' fallback default, and so a missing key redirects
    // before a doomed generate request ever fires. initedRef keeps this body
    // running exactly once even though `settings` is re-set (new reference)
    // on every reload().
    if (!settings || initedRef.current) return
    initedRef.current = true
    lastModeRef.current = settings.practice_mode

    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

      if (settings!.practice_mode === 'ai' && !getApiKey()) {
        router.push('/settings?focus=apikey')
        return
      }

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
  }, [settings]) // eslint-disable-line

  // The initedRef latch above only ever runs its body once, so a settings
  // reload after the initial load (e.g. switching to AI mode and saving a
  // key via the "Open settings" button on the no-content screen) would
  // otherwise leave the page stuck showing the stale no_content/error state
  // forever, with no automatic or manual way to retry. Re-fetch once when
  // practice_mode actually changes post-init and we're in one of those
  // stuck states.
  useEffect(() => {
    if (!initedRef.current || !settings) return
    if (lastModeRef.current === settings.practice_mode) return
    lastModeRef.current = settings.practice_mode
    if (state.status === 'no_content' || state.status === 'error') {
      fetchSentence()
    }
  }, [settings?.practice_mode]) // eslint-disable-line

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
    if (state.status === 'loading') { clearedDraftRef.current = false; return }
    if (!userIdRef.current || !state.sentence || state.status === 'submitted') return
    if (clearedDraftRef.current) return
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

  function goToDashboard() {
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
        clearedDraftRef.current = true
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
      clearedDraftRef.current = true
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

  // Swaps the current sentence for a new one without grading it — no
  // round-progress increment, no streak/accuracy change, since the user
  // never submitted an answer for it.
  async function handleSkip() {
    if (!cardWrapRef.current) {
      await fetchSentence()
      return
    }
    await gsap.to(cardWrapRef.current, { opacity: 0, x: -32, duration: 0.25, ease: 'power2.in' })
    gsap.set(cardWrapRef.current, { opacity: 1, x: 0 })
    await fetchSentence()
    gsap.fromTo(cardWrapRef.current,
      { opacity: 0, x: 32 },
      { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
    )
  }

  function handleUnlockComplete(words: CorpusWord[]) {
    claimUnlock()
    clearDraft()
    clearedDraftRef.current = true
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

  // Mirrors SentenceCard's "↵ Enter to submit" affordance — analysis mode
  // has no text input to steal focus, so a bare Enter always advances.
  useEffect(() => {
    if (!analysisMode) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        exitAnalysis()
        handleNext()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [analysisMode]) // eslint-disable-line

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

  function getGradeMessage(score: number): { title: string; description: string; encouragement: string } {
    if (score >= 90) return { title: 'Excellent!', description: 'You nailed the translation.', encouragement: 'Keep it up!' }
    if (score >= 70) return { title: 'Great job!', description: 'You understood most of the sentence.', encouragement: 'Keep going!' }
    if (score >= 40) return { title: 'Getting there', description: 'You caught some of the meaning.', encouragement: 'Review the words below.' }
    return { title: 'Keep practicing', description: 'This one was tricky.', encouragement: 'Check the correct answer below.' }
  }

  const activeVocabZh: string[] = []

  // ── Analysis mode — full-screen takeover ───────────────────────────
  if (analysisMode && state.sentence) {
    return (
      <AppShell
        rightRail={
          <AnalysisRightRail
            sentence={state.sentence}
            vocabList={vocabList}
            grammarFocus={state.grade?.grammarFocus}
            sentenceStructure={state.grade?.sentenceStructure}
          />
        }
      >
        <div className="flex flex-col min-h-screen px-4 py-8 xl:py-10 max-w-lg xl:max-w-4xl mx-auto">

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

          {/* Score ring + grade message */}
          {state.grade && (() => {
            const msg = getGradeMessage(state.grade.score)
            return (
              <div className="flex items-center gap-4 mb-8">
                <ScoreRing score={state.grade.score} size={72} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
                    {msg.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {msg.description}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {msg.encouragement}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Annotated sentence + speaker/turtle column — mt-10 keeps the
              tap-to-inspect tooltip clear of the viewport top. Sentence is
              left-aligned; pr-24 just clears the absolutely positioned
              speaker column on the right. */}
          <div className="relative mt-10 mb-2">
            <div className="pr-24">
              <AnalysisSentence
                sentence={state.sentence}
                vocabList={vocabList}
              />
              {state.grade?.correct_answer && (
                <p className="text-sm mt-3" style={{ color: 'var(--accent-text)' }}>
                  {state.grade.correct_answer}
                </p>
              )}
            </div>
            <div className="absolute right-0 top-0">
              <SpeakerButton text={state.sentence.sentence_zh} />
            </div>
          </div>

          {/* Dotted divider */}
          <div className="flex items-center gap-2 my-6" aria-hidden="true">
            <div className="flex-1 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />
            <span className="w-1.5 h-1.5 rotate-45 flex-shrink-0" style={{ background: 'var(--accent)' }} />
            <div className="flex-1 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />
          </div>

          {/* Words in this sentence — a grid at xl+ (fixed column widths
              shared by every row) so the percentage/POS/status columns line
              up vertically down the list: same x position, different y.
              Below xl it falls back to a simple flex row (narrower
              viewports don't have room for rigid columns). */}
          <div
            className="rounded-2xl p-4 xl:p-6 mb-4"
            style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Words in this sentence
            </p>
            <div className="divide-y divide-[color:var(--border)]">
              {state.sentence.vocab_used.map(zh => {
                const word = vocabList.find(w => w.word_zh === zh)
                if (!word) return null
                const status = getWordStatus(word.times_seen, word.times_correct)
                const statusKey = status.tone.slice('status-'.length) as StatusTag
                const statusColor = getStatusColor(statusKey)
                const pct = word.times_seen > 0 ? `${Math.round((word.times_correct / word.times_seen) * 100)}%` : '—%'
                return (
                  <div
                    key={zh}
                    className="flex items-center justify-between gap-2 py-2.5 xl:grid xl:grid-cols-[minmax(0,1fr)_56px_100px_170px] xl:gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-hanzi text-lg xl:text-xl flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {word.word_zh}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs" style={{ color: 'var(--accent-text)' }}>
                          {word.pinyin}
                        </span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                          {word.english}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 xl:contents">
                      <span className="text-xs tabular-nums xl:text-right" style={{ color: statusColor }}>{pct}</span>
                      <Badge tone={`pos-${word.pos}`}>{word.pos}</Badge>
                      <span className="text-xs font-medium whitespace-nowrap inline-flex items-center gap-1" style={{ color: statusColor }}>
                        {statusKey === 'good' && '✓'}
                        {statusKey === 'review' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                          </svg>
                        )}
                        {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grammar-analysis cards — same cards AnalysisRightRail renders in
              the actual right rail at xl+. RightRail (src/components/shell/
              RightRail.tsx) is `hidden xl:flex`, so below xl this content
              would otherwise be completely unreachable — this app is
              mobile-first, and these cards are the whole point of the
              /api/grade grammar-analysis extension. Duplicating the render
              here (rather than a single responsive component) mirrors
              RightRail's own hidden/flex split, just inverted. */}
          <div className="xl:hidden space-y-4 mb-4">
            <SentenceBreakdownCard segments={state.grade?.sentenceStructure} vocabList={vocabList} />
            <GrammarFocusCard grammarFocus={state.grade?.grammarFocus} />
            <TipsCard sentence={state.sentence} vocabList={vocabList} grammarFocus={state.grade?.grammarFocus} />
          </div>

          {/* Next sentence */}
          <div className="mt-auto">
            <button
              onClick={() => { exitAnalysis(); handleNext() }}
              className="w-full rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98] hover-accent"
              style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
            >
              Next sentence →
            </button>
            <p className="text-xs text-center mt-3" style={{ color: 'var(--text-tertiary)' }}>
              Press Enter
            </p>
          </div>

        </div>
      </AppShell>
    )
  }

  // ── Normal practice mode ───────────────────────────────────────────
  return (
    <AppShell rightRail={<PracticeRightRail />}>
      <div className="min-h-screen flex flex-col px-4 py-8 xl:py-10 max-w-lg xl:max-w-4xl mx-auto">

        {/* Top nav — 3-column grid so the words/mode pill group is truly
            centered regardless of the left/right groups' widths (a plain
            flex justify-between wouldn't center it against unequal
            siblings). */}
        <div className="grid grid-cols-3 items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="justify-self-start text-sm flex items-center gap-1.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ← Back to Dashboard
          </button>

          <div className="justify-self-center flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {vocabCount} words
            </span>

            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                color: settings?.practice_mode === 'ai' ? 'var(--accent-text)' : 'var(--text-tertiary)',
                backgroundColor: settings?.practice_mode === 'ai' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                border: '0.5px solid var(--border)',
              }}
            >
              {settings?.practice_mode === 'ai' ? 'AI mode' : 'Free mode'}
            </span>
          </div>

          <div className="justify-self-end flex items-center gap-2">
            <StreakFlame streak={currentStreak} />

            <Link
              href="/settings"
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
            </Link>

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

          {state.status === 'error' && (
            <div
              className="rounded-3xl p-6 flex flex-col items-center text-center gap-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {state.error || 'Something went wrong generating your sentence.'}
              </p>
              <button
                onClick={() => fetchSentence()}
                className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] hover-accent"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Try again
              </button>
            </div>
          )}

          {state.status === 'no_content' && (
            <div
              className="rounded-3xl p-6 flex flex-col items-center text-center gap-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We&apos;re out of practice sentences for your current words — try unlocking more, or switch to AI mode in Settings.
              </p>
              <div className="flex gap-2">
                {canUnlock && (
                  <button
                    onClick={() => setShowUnlock(true)}
                    className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] hover-accent"
                    style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                  >
                    Unlock more words
                  </button>
                )}
                <Link
                  href="/settings"
                  className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98] hover-bg hover-border inline-flex items-center justify-center"
                  style={{
                    backgroundColor: canUnlock ? 'transparent' : 'var(--accent)',
                    border: canUnlock ? '1px solid var(--border)' : 'none',
                    color: canUnlock ? 'var(--text-secondary)' : 'white',
                  }}
                >
                  Open settings
                </Link>
              </div>
            </div>
          )}

          {state.sentence && state.status !== 'loading' && state.status !== 'error' && state.status !== 'no_content' && (
            <SentenceCard
              sentence={state.sentence}
              pinyinMode={state.pinyinMode}
              showPinyinSetting={settings?.show_pinyin ?? 'tap'}
              onTogglePinyin={togglePinyin}
              userAnswer={state.userAnswer}
              onAnswerChange={setAnswer}
              onSubmit={submitAnswer}
              onSkip={handleSkip}
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
    </AppShell>
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
