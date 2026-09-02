import Link from 'next/link'
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
 */
export function NavLink({ item, active, onClick }: Props) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
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
}
