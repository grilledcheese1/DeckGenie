'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useProgress } from '@/hooks/useProgress'
import { useVocabSheet } from '@/hooks/useVocabSheet'
import { VocabSheet } from '@/components/vocab/VocabSheet'
import { createClient } from '@/lib/supabase/client'
import { NeonSign } from '@/components/ui/NeonSign'
import {NeonSignH} from "@/components/ui/NeonSignH";

export default function DashboardPage() {
  const router = useRouter()
  const { progress, settings, vocabCount, loading, canUnlock } = useProgress()
  const {
    words, loading: vocabLoading, hasMore, filters,
    open: openVocab, loadMore, applyFilter, removeWord,
  } = useVocabSheet()

  const [sheetOpen, setSheetOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
        <div
          className="w-5 h-5 rounded-full animate-spin"
          style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const roundsCompleted    = progress?.rounds_completed ?? 0
  const currentRound       = progress?.current_round_number ?? 1
  const currentSentences   = progress?.current_round_sentences ?? 0
  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsInCycle      = roundsCompleted % roundsBeforeUnlock

  return (
    <div ref={containerRef} className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      {/* Neon signs — dashboard background. Adjust style={{ }} per sign to reposition. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.13, zIndex: 0 }} aria-hidden="true">
        <NeonSign english="MASTER"    chinese="融会贯通 " color="#00fff5" glowColor="rgba(0,255,245,0.35)" size={4} delay={0}   className="absolute" style={{ left: '-38%',  top: '8%' }} />
        <NeonSignH english="PERSIST"  chinese="坚持" color="#ff2d78" glowColor="rgba(255,45,120,0.35)" size={2.5} delay={1} className="absolute" style={{ left: '6%', bottom: '4%'}} />
        <NeonSign english="LEARNING" chinese="沉浸式学习" color="#ffb800" glowColor="rgba(255,184,0,0.35)"  size={3.3} delay={2} className="absolute" style={{ left: '40%',  bottom: '60%' }} />
        <NeonSign english="CULTIVATION" chinese="语感培养 " color="#AEFF00" glowColor="rgba(157, 255, 0, 0.8)"  size={2.3} delay={2.4} className="absolute" style={{ left: '29%',  bottom: '80%' }} />
      </div>
      <div className="relative" style={{ zIndex: 1 }}>

      {/* Header */}
      <div className="dash-card flex items-center justify-between mb-10">
        <div>
          <p className="font-hanzi text-3xl" style={{ color: 'var(--hanzi-color)' }}>汉字练习</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            HSK {settings?.starting_hsk ?? 1} · {vocabCount} words active
          </p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover-border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
          }}
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
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Round cycle progress */}
      <div
        className="dash-card rounded-2xl p-5 mb-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Round {currentRound}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {currentSentences} / {sentencesPerRound} sentences
          </p>
        </div>

        {/* Sentence progress bar */}
        <div
          className="w-full h-1.5 rounded-full mb-4 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentSentences / sentencesPerRound) * 100}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>

        {/* Round cycle pips */}
        <div className="flex items-center gap-2">
          {Array.from({ length: roundsBeforeUnlock }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i < roundsInCycle
                    ? 'var(--accent)'
                    : i === roundsInCycle && currentSentences > 0
                    ? 'var(--accent-subtle)'
                    : 'var(--bg-tertiary)',
              }}
            />
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {roundsBeforeUnlock - roundsInCycle} round{roundsBeforeUnlock - roundsInCycle !== 1 ? 's' : ''} until +{settings?.words_per_unlock ?? 5} new words
        </p>
      </div>

      {/* Unlock banner */}
      {canUnlock && (
        <div
          className="dash-card rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>New words ready</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>
              You&#39;ve earned {settings?.words_per_unlock ?? 5} new words
            </p>
          </div>
          <button
            onClick={() => router.push('/practice?unlock=true')}
            className="px-4 py-2 text-xs font-medium rounded-xl transition-colors hover-accent"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            Unlock →
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="dash-card space-y-3 mt-2">
        <button
          onClick={() => router.push('/practice')}
          className="w-full active:scale-[0.98] font-medium rounded-2xl py-4 text-sm transition-all hover-accent"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {currentSentences > 0 ? 'Continue practice' : 'Start practice'}
        </button>

        <button
          onClick={handleOpenVocab}
          className="w-full font-medium rounded-2xl py-3.5 text-sm transition-all hover-bg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          View vocab list
        </button>

        <button
          onClick={handleSignOut}
          className="w-full text-xs py-2 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Sign out
        </button>
      </div>

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
    </div>
  )
}
