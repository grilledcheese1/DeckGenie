'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useProgress } from '@/hooks/useProgress'
import { useVocabSheet } from '@/hooks/useVocabSheet'
import { VocabSheet } from '@/components/vocab/VocabSheet'
import { AppShell } from '@/components/shell/AppShell'
import { DashboardRightRail } from '@/components/dashboard/DashboardRightRail'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import { NeonSign } from '@/components/ui/NeonSign'
import type { SignMode } from '@/components/ui/NeonSign'
import { THEME_CHANGE_EVENT, themeToSignMode, type ThemeId } from '@/lib/theme'
import type { Settings } from '@/types'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const

/**
 * A few overlapping low-opacity curved paths suggesting mountains, plus a
 * tiny pagoda silhouette — purely decorative watermark for the round-progress
 * card. Deliberately simple; not the focus of this task.
 */
function MountainWatermark() {
  return (
    <svg
      viewBox="0 0 300 140"
      className="absolute inset-x-0 bottom-0 w-full h-28 pointer-events-none"
      style={{ opacity: 0.06 }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax slice"
    >
      <path d="M0 140 L40 80 L70 110 L110 50 L150 100 L190 60 L230 110 L260 90 L300 140 Z" fill="var(--text-primary)" />
      <path d="M0 140 L60 100 L100 125 L140 90 L180 130 L220 95 L260 130 L300 110 L300 140 Z" fill="var(--text-primary)" opacity="0.6" />
      <g transform="translate(215,52)" fill="var(--text-primary)">
        <rect x="-3" y="32" width="6" height="18" />
        <polygon points="-15,32 15,32 0,15" />
        <polygon points="-11.5,17 11.5,17 0,4" />
        <polygon points="-8,4 8,4 0,-7" />
        <rect x="-1.5" y="-16" width="3" height="10" />
      </g>
    </svg>
  )
}

// Icon roundels for the stat row — plain emoji, matching the convention the
// right-rail cards (StreakCard/DailyGoalCard) already established for this
// task rather than inventing a new bespoke icon set.
const STAT_ICONS: Record<'rounds' | 'accuracy' | 'vocab', string> = {
  rounds: '🔁',
  accuracy: '🎯',
  vocab: '📖',
}

export default function DashboardPage() {
  const router = useRouter()
  const { progress, settings, vocabCount, loading, canUnlock, reload } = useProgress()
  const {
    words, loading: vocabLoading, hasMore, filters,
    open: openVocab, loadMore, applyFilter, removeWord,
  } = useVocabSheet()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [hskSaving, setHskSaving] = useState(false)
  const [signMode, setSignMode] = useState<SignMode>(() => {
    if (typeof window === 'undefined') return 'neon'
    const saved = (localStorage.getItem('hanzi-theme') ?? 'ink-jade') as ThemeId
    return themeToSignMode(saved)
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // signMode above is only captured once, at mount — without this, changing
  // the theme in Settings (which applies live, before/without needing Save)
  // leaves the neon signs frozen on whatever theme was active on page load,
  // mismatched against the rest of the now-recolored page.
  useEffect(() => {
    function onThemeChange(e: Event) {
      setSignMode(themeToSignMode((e as CustomEvent<ThemeId>).detail))
    }
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
  }, [])

  useEffect(() => {
    async function checkDraft() {
      try {
        const raw = localStorage.getItem('hanzi_session_draft')
        if (!raw) return
        const d = JSON.parse(raw)
        if (typeof d.userId !== 'string' || !d.userId || !isFinite(d.savedAt)) return
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && d.userId === user.id) setHasDraft(true)
      } catch {}
    }
    checkDraft()
  }, [])

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

  function handleResetDraft() {
    try { localStorage.removeItem('hanzi_session_draft') } catch {}
    setHasDraft(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Wires the "HSK N ▾" pill to the same settings-update path
  // `SettingsForm.handleSave` uses (`supabase.from('settings').update(...)`),
  // then reloads progress/settings via `useProgress`'s `reload` so the rest
  // of the dashboard (and the Sidebar's own `useProgress()` instance, on its
  // next mount/read) reflects the change.
  async function handleHskChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextHsk = Number(e.target.value) as Settings['starting_hsk']
    if (nextHsk === settings?.starting_hsk) return
    setHskSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase
          .from('settings')
          .update({ starting_hsk: nextHsk })
          .eq('user_id', user.id)
        if (error) console.error('Failed to update starting_hsk:', error.message)
      }
      await reload()
    } finally {
      setHskSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell rightRail={<DashboardRightRail />}>
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      </AppShell>
    )
  }

  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const roundsCompleted    = progress?.rounds_completed ?? 0
  const currentRound       = progress?.current_round_number ?? 1
  const currentSentences   = progress?.current_round_sentences ?? 0
  const sentencesPerRound  = settings?.sentences_per_round ?? 10
  const roundsInCycle      = roundsCompleted % roundsBeforeUnlock

  return (
    <AppShell rightRail={<DashboardRightRail />}>
      <div ref={containerRef} className="min-h-screen px-4 py-8 max-w-lg mx-auto">
        {/* Neon signs — dashboard background. Adjust style={{ }} per sign to reposition. */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.13, zIndex: 0 }} aria-hidden="true">
          <NeonSign english="MASTER"    chinese="融会贯通 " color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={4} delay={0}   mode={signMode} className="absolute" style={{ left: '-28%',  top: '8%' }} />
          <NeonSign english="PERSIST"  chinese="坚持" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={2.5} delay={1} mode={signMode} className="absolute" style={{ left: '-40%',  top: '-51%' }} />
          <NeonSign english="INKITSU"  chinese="音吉" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined} size={1.7} delay={1} mode={signMode} className="absolute" style={{ left: '-40%',  top: '-48%' }} />

          <NeonSign english="LEARNING" chinese="沉浸式学习" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={3.3} delay={1.3} mode={signMode} className="absolute" style={{ left: '40%',  bottom: '120%' }} />
          <NeonSign english="CULTIVATION" chinese="语感培养" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={2.3} delay={1.8} mode={signMode} className="absolute" style={{ left: '29%',  bottom: '126%' }} />
          <NeonSign english="JOURNEY OF MANY MILES" chinese="千里之行，始于足下" color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}  size={1.3} delay={2.2} mode={signMode} className="absolute" style={{ left: '29%',  bottom: '200%' }} />
        </div>
        <div className="relative" style={{ zIndex: 1 }}>

        {/* Vocab count + HSK level control */}
        <div className="dash-card flex items-center justify-between mb-8">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {vocabCount} words active
          </p>

          <div className="relative inline-flex items-center">
            <select
              value={settings?.starting_hsk ?? 1}
              onChange={handleHskChange}
              disabled={hskSaving}
              aria-label="Starting HSK level"
              className="appearance-none rounded-full pl-3 pr-7 py-1.5 text-xs font-medium transition-all hover-border disabled:opacity-60 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {HSK_LEVELS.map(level => (
                <option key={level} value={level}>HSK {level}</option>
              ))}
            </select>
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute right-2.5 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Stats row */}
        <div className="dash-card grid grid-cols-3 gap-3 mb-6">
          {[
            { key: 'rounds' as const,   label: 'Rounds',   value: roundsCompleted },
            { key: 'accuracy' as const, label: 'Accuracy', value: `${progress?.rolling_accuracy ?? 0}%` },
            { key: 'vocab' as const,    label: 'Vocab',     value: vocabCount },
          ].map(({ key, label, value }) => (
            <Card key={key} padding="md">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
                aria-hidden="true"
              >
                {STAT_ICONS[key]}
              </div>
              <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            </Card>
          ))}
        </div>

        {/* Round cycle progress */}
        <Card padding="lg" className="dash-card relative overflow-hidden mb-4">
          <MountainWatermark />
          <div className="relative" style={{ zIndex: 1 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Round {currentRound}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {currentSentences} / {sentencesPerRound} sentences
              </p>
            </div>

            <ProgressBar
              value={currentSentences}
              max={sentencesPerRound}
              className="mb-4"
              aria-label="Sentences completed this round"
            />

            {/* Round cycle pip-stepper */}
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
        </Card>

        {/* Unlock banner */}
        {canUnlock && (
          <Card
            padding="md"
            className="dash-card mb-4 flex items-center justify-between"
            style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>New words ready</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>
                You&#39;ve earned {settings?.words_per_unlock ?? 5} new words
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => router.push('/practice?unlock=true')}>
              Unlock →
            </Button>
          </Card>
        )}

        {/* Action buttons */}
        <div className="dash-card space-y-3 mt-2">
          {hasDraft ? (
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={handleResetDraft}>
                Reset session
              </Button>
              <Button variant="primary" size="lg" icon="ink" className="flex-1" onClick={() => router.push('/practice')}>
                Continue practice
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" icon="ink" className="w-full" onClick={() => router.push('/practice')}>
              {currentSentences > 0 ? 'Continue practice' : 'Start practice'}
            </Button>
          )}

          <Button variant="secondary" size="lg" className="w-full" onClick={handleOpenVocab}>
            View vocab list
          </Button>

          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSignOut}>
            Sign out
          </Button>
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
    </AppShell>
  )
}
