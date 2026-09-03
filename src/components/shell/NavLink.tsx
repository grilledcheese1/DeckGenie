'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import type { NavItem } from './navItems'

interface Props {
  item: NavItem
  active: boolean
  /** Optional extra click handler — e.g. MobileDrawer closes itself instantly
   * on any nav click, whether or not the route actually changes. */
  onClick?: () => void
}

/**
 * A single nav row. Shared between `Sidebar` and `MobileDrawer` (previously
 * duplicated verbatim in both) so the active-pill styling can't silently
 * diverge between the desktop and mobile nav lists.
 *
 * The active highlight is a single shared-layout element (`layoutId`), not a
 * per-row background toggle — when `active` moves to another row, Motion
 * FLIP-animates the pill between the old and new row so it *slides*. Each nav
 * list wraps its rows in a `<LayoutGroup id>` so the desktop and mobile pills
 * stay independent (see `Sidebar`/`MobileDrawer`).
 */
export function NavLink({ item, active, onClick }: Props) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? '' : 'hover-bg'}`}
      style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--text-secondary)' }}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-xl"
          style={{ backgroundColor: 'var(--sidebar-active-bg)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3">
        <Icon width={16} height={16} className="flex-shrink-0" />
        <span>{item.label}</span>
      </span>
    </Link>
  )
}
