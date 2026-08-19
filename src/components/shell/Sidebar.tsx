'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useProgress } from '@/hooks/useProgress'
import { useTodayStats } from '@/hooks/useTodayStats'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { NAV_ITEMS, isNavItemActive } from './navItems'
import { NavLink } from './NavLink'
import { Wordmark } from './Wordmark'

/**
 * Desktop sidebar — logo, nav list, and a bottom-anchored Daily Goal card +
 * profile chip (with a Settings/Sign-out dropdown). Hidden below `md`; see
 * `MobileTopBar`/`MobileDrawer` for the small-viewport equivalent.
 */
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { settings } = useProgress()
  const { sentencesDone, loading: statsLoading, error: statsError } = useTodayStats()

  const [email, setEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const chipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null)
      })
      .catch(() => {
        if (!cancelled) setEmail(null)
      })
    return () => { cancelled = true }
  }, [])

  // Move focus into the dropdown when it opens.
  useEffect(() => {
    if (menuOpen) firstMenuItemRef.current?.focus()
  }, [menuOpen])

  // Close the profile dropdown on outside click, tabbing focus away, or
  // Escape — this is a plain disclosure/dropdown (see the JSX below: no
  // `role="menu"`), not a full ARIA menu widget, so no arrow-key roving
  // focus is implemented — just don't claim the `menu` pattern.
  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    // Covers keyboard users tabbing away from the dropdown (mousedown alone
    // doesn't fire for Tab-driven focus changes).
    function onFocusIn(e: FocusEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sentencesPerRound = settings?.sentences_per_round ?? 10
  const hskLevel = settings?.starting_hsk ?? 1
  const initial = email ? email[0].toUpperCase() : '?'

  // An RLS denial / network failure should never silently render as "0
  // sentences today" — show a neutral "—" instead once data has failed to
  // load, rather than a confident (and wrong) count.
  const dailyGoalDisplay = statsError ? '—' : statsLoading ? '…' : sentencesDone
  const dailyGoalValue = statsError || statsLoading ? 0 : sentencesDone

  return (
    <aside
      className="hidden md:flex md:flex-col w-64 flex-shrink-0 h-screen sticky top-0 px-4 py-6"
      style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Logo block */}
      <div className="px-2 mb-8">
        <Wordmark />
      </div>

      {/* Nav list */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
        ))}
      </nav>

      {/* Daily Goal mini-card */}
      <Card padding="md" className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Daily goal</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {dailyGoalDisplay} / {sentencesPerRound}
          </p>
        </div>
        <ProgressBar
          value={dailyGoalValue}
          max={sentencesPerRound}
          aria-label="Today's sentences toward daily goal"
        />
      </Card>

      {/* Profile chip + dropdown */}
      <div ref={chipRef} className="relative flex-shrink-0">
        {menuOpen && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden py-1"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <Link
              ref={firstMenuItemRef}
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 text-sm transition-colors hover-bg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors hover-bg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign out
            </button>
          </div>
        )}

        <button
          ref={triggerRef}
          onClick={() => setMenuOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors hover-bg"
          aria-expanded={menuOpen}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {email ?? 'Account'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>HSK {hskLevel}</p>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className="flex-shrink-0 transition-transform"
            style={{ color: 'var(--text-tertiary)', transform: menuOpen ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
