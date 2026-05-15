'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useProgress } from '@/hooks/useProgress'
import { useVocabSheet } from '@/hooks/useVocabSheet'
import { VocabSheet } from '@/components/vocab/VocabSheet'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const { progress, settings, vocabCount, loading } = useProgress()
  const {
    words, loading: vocabLoading, hasMore, filters,
    open: openVocab, loadMore, applyFilter, removeWord,
  } = useVocabSheet()

  const [sheetOpen, setSheetOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // GSAP staggered entrance
  useEffect(() => {
    if (loading || !containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.dash-card',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [loading])

  function handleOpenVocab() {
    setSheetOpen(true)
    openVocab()
  }

  function handleCloseVocab() {
    setSheetOpen(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const roundsCompleted    = progress?.rounds_completed ?? 0
  const currentRound       = progress?.current_round_number ?? 1
  const currentSentences   = progress?.current_round_sentences ?? 0
  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsInCycle      = roundsCompleted % roundsBeforeUnlock
  const canUnlock          = roundsCompleted > 0 && roundsCompleted % roundsBeforeUnlock === 0

  return (
    <div ref={containerRef} className="min-h-screen px-4 py-8 max-w-lg mx-auto">

      {/* Header */}
      <div className="dash-card flex items-center justify-between mb-10">
        <div>
          <p className="font-hanzi text-3xl text-emerald-400">汉字练习</p>
          <p className="text-stone-500 text-xs mt-0.5">
            HSK {settings?.starting_hsk ?? 1} · {vocabCount} words active
          </p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="w-9 h-9 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-all"
          aria-label="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Stats row */}
      <div className="dash-card grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Rounds',   value: roundsCompleted },
          { label: 'Accuracy', value: `${progress?.rolling_accuracy ?? 0}%` },
          { label: 'Vocab',    value: vocabCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
            <p className="text-2xl font-medium text-stone-100">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Round cycle progress */}
      <div className="dash-card bg-stone-900 rounded-2xl border border-stone-800 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-stone-300">Round {currentRound}</p>
          <p className="text-xs text-stone-500">
            {currentSentences} / {sentencesPerRound} sentences
          </p>
        </div>

        {/* Sentence progress bar */}
        <div className="w-full h-1.5 bg-stone-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${(currentSentences / sentencesPerRound) * 100}%` }}
          />
        </div>

        {/* Round cycle pips */}
        <div className="flex items-center gap-2">
          {Array.from({ length: roundsBeforeUnlock }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < roundsInCycle
                  ? 'bg-emerald-500'
                  : i === roundsInCycle && currentSentences > 0
                  ? 'bg-emerald-800'
                  : 'bg-stone-800'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-stone-600 mt-2">
          {roundsBeforeUnlock - roundsInCycle} round{roundsBeforeUnlock - roundsInCycle !== 1 ? 's' : ''} until +{settings?.words_per_unlock ?? 5} new words
        </p>
      </div>

      {/* Unlock banner */}
      {canUnlock && (
        <div className="dash-card bg-emerald-950/50 border border-emerald-800/60 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">New words ready</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              You&#39;ve earned {settings?.words_per_unlock ?? 5} new words
            </p>
          </div>
          <button
            onClick={() => router.push('/practice?unlock=true')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Unlock →
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="dash-card space-y-3 mt-2">
        <button
          onClick={() => router.push('/practice')}
          className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white font-medium rounded-2xl py-4 text-sm transition-all"
        >
          {currentSentences > 0 ? 'Continue practice' : 'Start practice'}
        </button>

        <button
          onClick={handleOpenVocab}
          className="w-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 font-medium rounded-2xl py-3.5 text-sm transition-all"
        >
          View vocab list
        </button>

        <button
          onClick={handleSignOut}
          className="w-full text-stone-600 hover:text-stone-400 text-xs py-2 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Vocab sheet */}
      {sheetOpen && (
        <VocabSheet
          words={words}
          loading={vocabLoading}
          hasMore={hasMore}
          filters={filters}
          onClose={handleCloseVocab}
          onLoadMore={loadMore}
          onFilterChange={applyFilter}
          onRemove={removeWord}
          totalCount={vocabCount}
        />
      )}

    </div>
  )
}
