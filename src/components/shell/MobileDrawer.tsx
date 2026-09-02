'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { gsap } from 'gsap'
import { NAV_ITEMS, isNavItemActive } from './navItems'
import { NavLink } from './NavLink'
import { Wordmark } from './Wordmark'

interface Props {
  onClose: () => void
}

/**
 * Slide-out mobile nav drawer. Mirrors the exact GSAP overlay+slide pattern
 * from `SettingsPanel`/`VocabSheet` (gsap.context on mount, a close
 * timeline, Escape + click-outside-to-close) — but slides in from the left
 * (`x: '-100%'` → `'0%'`) since this is a left-side drawer, vs. SettingsPanel's
 * right-side panel.
 *
 * Open/close *state* is owned by `AppShell` (see its comment), not here —
 * this component is only mounted while open and calls `onClose` when its
 * close animation finishes, or immediately (via AppShell) on route change.
 */
export function MobileDrawer({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Both the open tweens and any later close timeline live in one
  // gsap.context(), so a single ctx.revert() on unmount cleans up
  // whichever tween is running — e.g. AppShell force-unmounts this drawer
  // (route change) while the 0.35s close timeline is still animating.
  // Same ctxRef pattern InkButton.tsx already established for the same
  // class of bug.
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
      gsap.fromTo(panelRef.current,
        { x: '-100%' },
        { x: '0%', duration: 0.45, ease: 'power3.out' }
      )
    })
    ctxRef.current = ctx
    return () => {
      ctx.revert()
      ctxRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.add(() => {
      const tl = gsap.timeline({ onComplete: onClose })
      tl.to(panelRef.current, { x: '-100%', duration: 0.35, ease: 'power3.in' })
      tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.2')
    })
  }, [onClose])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex md:hidden"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="w-[80%] max-w-[300px] h-full overflow-y-auto px-4 py-6 flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-2 mb-8">
          <Wordmark />
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover-border"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
            aria-label="Close menu"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(item => (
            // onClick={onClose} (not handleClose) — a nav click should close
            // the drawer instantly, whether or not the route actually
            // changes (tapping the *current* route's link is a common way
            // to just glance at the nav and dismiss it, and AppShell's
            // route-change close only fires when the pathname differs).
            <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} onClick={onClose} />
          ))}
        </nav>
      </div>
    </div>
  )
}
