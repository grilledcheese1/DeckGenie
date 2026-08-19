'use client'

interface Props {
  onMenuClick: () => void
}

/**
 * `md:hidden` top bar shown on small viewports: hamburger + wordmark.
 * Stateless — `AppShell` owns whether the drawer is open (see its comment)
 * and passes down the click handler that opens it.
 */
export function MobileTopBar({ onMenuClick }: Props) {
  return (
    <header
      className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
      style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={onMenuClick}
        className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center transition-all hover-border"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <p className="font-semibold tracking-tight text-base" style={{ color: 'var(--text-primary)' }}>
        inkitsu
      </p>
    </header>
  )
}
