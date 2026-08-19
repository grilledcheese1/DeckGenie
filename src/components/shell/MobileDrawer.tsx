'use client'

import { useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { gsap } from 'gsap'
import { NAV_ITEMS, isNavItemActive } from './navItems'

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
    return () => ctx.revert()
  }, [])

  const handleClose = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(panelRef.current, { x: '-100%', duration: 0.35, ease: 'power3.in' })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.2')
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
          <div>
            <p className="font-semibold tracking-tight text-lg" style={{ color: 'var(--text-primary)' }}>
              inkitsu
            </p>
            <p className="font-hanzi text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              沉浸式学习
            </p>
          </div>
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
          {NAV_ITEMS.map(item => {
            const active = isNavItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? '' : 'hover-bg'}`}
                style={
                  active
                    ? { backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-text)' }
                    : { color: 'var(--text-secondary)' }
                }
                aria-current={active ? 'page' : undefined}
              >
                <Icon width={16} height={16} className="flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
