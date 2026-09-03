'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useProgress } from '@/hooks/useProgress'
import { useTodayStats } from '@/hooks/useTodayStats'
import { useUserEmail } from '@/hooks/useUserEmail'
import { useVocabSheet } from '@/hooks/useVocabSheet'
import { VocabSheet } from '@/components/vocab/VocabSheet'
import { AppShell } from '@/components/shell/AppShell'
import { DashboardRightRail } from '@/components/dashboard/DashboardRightRail'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { NeonSign } from '@/components/ui/NeonSign'
import type { SignMode } from '@/components/ui/NeonSign'
import { NEON_SIGN_COLOR, neonGlowFor } from '@/lib/neonSignPresets'
import { THEME_CHANGE_EVENT, themeToSignMode, type ThemeId } from '@/lib/theme'
import { SETTINGS_CHANGE_EVENT } from '@/lib/settingsEvents'
import { RoundsIcon, AccuracyIcon, VocabIcon } from '@/components/ui/StatIcons'
import type { Settings } from '@/types'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const

/**
 * Dot-and-line stepper across the current unlock cycle's rounds — one dot
 * per round in `settings.rounds_before_unlock` (NOT sentences_per_round;
 * this tracks the same "rounds until +N new words" cycle as the caption
 * below it, and its dot count scales with that setting, not with
 * sentences-per-round). Filled = round completed, a larger ring = the
 * current round, small outline = rounds still to come, with a connecting
 * line whose completed segments match the filled dots.
 */
function RoundDotTracker({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center" role="img" aria-label={`Round ${current + 1} of ${total} in this unlock cycle`}>
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < current
        const isCurrent = i === current
        return (
          <div key={i} className={`flex items-center ${i < total - 1 ? 'flex-1' : ''}`}>
            <div
              className="rounded-full flex-shrink-0 transition-all duration-300"
              style={
                isCurrent
                  ? { width: 20, height: 20, border: '3px solid var(--accent)', backgroundColor: 'transparent' }
                  : { width: 7, height: 7, backgroundColor: isCompleted ? 'var(--accent)' : 'var(--bg-tertiary)' }
              }
            />
            {i < total - 1 && (
              <div
                className="flex-1 h-px mx-1 transition-colors duration-300"
                style={{ backgroundColor: isCompleted ? 'var(--accent)' : 'var(--bg-tertiary)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Icon roundels for the stat row.
const STAT_ICONS: Record<'rounds' | 'accuracy' | 'vocab', React.ReactNode> = {
  rounds: <RoundsIcon />,
  accuracy: <AccuracyIcon />,
  vocab: <VocabIcon />,
}

/** Small sprout accent next to the "Welcome back" heading. */
function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21c8 0 14-6 14-14V5h-2C9 5 5 11 5 19v2Z" />
      <path d="M5 21c2.5-4 6-7 10.5-9" />
    </svg>
  )
}

/** Leading icon for the "View vocab list" row. */
function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { progress, settings, vocabCount, loading, canUnlock, reload } = useProgress()
  const { roundsDone: roundsToday } = useTodayStats()
  const {
    words, loading: vocabLoading, hasMore, filters,
    open: openVocab, loadMore, applyFilter, removeWord,
  } = useVocabSheet()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [hskSaving, setHskSaving] = useState(false)
  const [hskError, setHskError] = useState<string | null>(null)
  const email = useUserEmail()
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

  // Wires the "HSK N ▾" pill to the same settings-update path
  // `SettingsForm.handleSave` uses (`supabase.from('settings').update(...)`),
  // then reloads progress/settings via `useProgress`'s `reload` so the rest
  // of this page reflects the change. `Sidebar` holds its own separate
  // `useProgress()` instance though, so on success we also dispatch
  // `SETTINGS_CHANGE_EVENT` (same cross-component pattern `THEME_CHANGE_EVENT`
  // uses) so Sidebar's chip reloads and doesn't show a stale HSK level.
  //
  // A failed save (or a missing `user`) surfaces via `hskError` instead of
  // being swallowed — `reload()` still runs in `finally` and will snap the
  // `<select>` back to the last-saved value, but now with a visible reason
  // instead of an unexplained silent revert.
  async function handleHskChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextHsk = Number(e.target.value) as Settings['starting_hsk']
    if (nextHsk === settings?.starting_hsk) return
    setHskSaving(true)
    setHskError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHskError('Could not save — please sign in again.')
        return
      }
      const { error } = await supabase
        .from('settings')
        .update({ starting_hsk: nextHsk })
        .eq('user_id', user.id)
      if (error) {
        console.error('Failed to update starting_hsk:', error.message)
        setHskError('Could not save HSK level. Please try again.')
        return
      }
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT))
    } finally {
      setHskSaving(false)
      await reload()
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
  const currentHsk         = settings?.starting_hsk ?? 1

  // No display-name field exists in this app's data model — best-effort
  // greeting derived from the email's local part (matching the convention
  // Sidebar already uses for the profile-chip initial), not a real name.
  const displayName = email
    ? email.split('@')[0].split(/[._+]/)[0].replace(/^\w/, c => c.toUpperCase())
    : 'there'

  return (
    <AppShell rightRail={<DashboardRightRail />}>
      <div ref={containerRef} className="min-h-screen px-6 py-8 w-full max-w-3xl">
        {/* Neon signs — dashboard background. Adjust style={{ }} per sign to reposition. */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.13, zIndex: 0 }} aria-hidden="true">
          <NeonSign english="MASTER"    chinese="融会贯通 " color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)} size={4} delay={0}   mode={signMode} className="absolute" style={{ left: '-28%',  top: '8%' }} />
          <NeonSign english="PERSIST"  chinese="坚持" color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)} size={2.5} delay={1} mode={signMode} className="absolute" style={{ left: '-40%',  top: '-51%' }} />
          <NeonSign english="INKITSU"  chinese="音吉" color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)} size={1.7} delay={1} mode={signMode} className="absolute" style={{ left: '-40%',  top: '-48%' }} />

          <NeonSign english="LEARNING" chinese="沉浸式学习" color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)}  size={3.3} delay={1.3} mode={signMode} className="absolute" style={{ left: '40%',  bottom: '120%' }} />
          <NeonSign english="CULTIVATION" chinese="语感培养" color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)}  size={2.3} delay={1.8} mode={signMode} className="absolute" style={{ left: '29%',  bottom: '126%' }} />
          <NeonSign english="JOURNEY OF MANY MILES" chinese="千里之行，始于足下" color={NEON_SIGN_COLOR} glowColor={neonGlowFor(signMode)}  size={1.3} delay={2.2} mode={signMode} className="absolute" style={{ left: '29%',  bottom: '200%' }} />
        </div>
        <div className="relative" style={{ zIndex: 1 }}>

        {/* Welcome heading + HSK level control */}
        <div className="dash-card mb-8">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <LeafIcon />
              Welcome back, {displayName}
            </h1>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
              {hskError && (
                <p className="text-xs" style={{ color: 'var(--error-text)' }} role="alert">
                  {hskError}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            HSK {currentHsk} · {vocabCount} words active
          </p>
        </div>

        {/* Stats row */}
        <div className="dash-card grid grid-cols-3 gap-4 mb-6">
          {[
            { key: 'rounds' as const,   label: 'Rounds',   subLabel: 'Today',   value: roundsToday },
            { key: 'accuracy' as const, label: 'Accuracy', subLabel: 'Overall', value: `${progress?.rolling_accuracy ?? 0}%` },
            { key: 'vocab' as const,    label: 'Words',    subLabel: 'Active',  value: vocabCount },
          ].map(({ key, label, subLabel, value }) => (
            <Card key={key} padding="lg" className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
                aria-hidden="true"
              >
                {STAT_ICONS[key]}
              </div>
              <div>
                <p className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>{subLabel}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Round cycle progress */}
        <Card padding="xl" className="dash-card mb-4" style={{ minHeight: '220px' }}>
          <div className="flex flex-col h-full" style={{ minHeight: '164px' }}>
            <div className="flex items-center justify-between">
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>Round {currentRound}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {currentSentences} / {sentencesPerRound} sentences
              </p>
            </div>

            {/* Vertically centered in the remaining space, left-aligned —
                matches the reference layout instead of sitting right under
                the header. */}
            <div className="flex-1 flex items-center">
              <RoundDotTracker current={roundsInCycle} total={roundsBeforeUnlock} />
            </div>

            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
          <Button
            variant="primary" size="xl" icon="ink" trailingIcon="right"
            subtitle={hasDraft || currentSentences > 0 ? `Round ${currentRound}` : `Begin Round ${currentRound}`}
            className="w-full"
            onClick={() => router.push('/practice')}
          >
            {hasDraft || currentSentences > 0 ? 'Continue practice' : 'Start practice'}
          </Button>

          {/* Points down (not the ordinary right-chevron) — this opens
              VocabSheet, a bottom sheet, not a side panel or new page. */}
          <Button
            variant="secondary" size="lg" leadingIcon={<ListIcon />} trailingIcon="down"
            className="w-full" onClick={handleOpenVocab}
          >
            View vocab list
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
