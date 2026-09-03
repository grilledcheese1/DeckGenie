'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'motion/react'
import { Sidebar } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'
import { MobileDrawer } from './MobileDrawer'
import { RightRail } from './RightRail'

interface Props {
  children: React.ReactNode
  rightRail?: React.ReactNode
}

/**
 * `AppShell` owns the mobile drawer's open/closed state (rather than
 * `MobileTopBar` owning it) — `AppShell` is the one place that also knows
 * about route changes via `usePathname()`, and closing the drawer on
 * navigation needs to happen regardless of which nav link inside the
 * drawer was clicked. Centralizing it here means `MobileTopBar` and
 * `MobileDrawer` both stay simple, controlled components.
 *
 * `AppShell` only composes `Sidebar`/`MobileTopBar`/`MobileDrawer`/
 * `RightRail` — it doesn't reimplement any of their internals.
 */
export function AppShell({ children, rightRail }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer on route change. Adjusted during render (React's
  // documented "adjusting state when a prop changes" pattern —
  // https://react.dev/learn/you-might-not-need-an-effect) rather than in a
  // useEffect, so it takes effect on the very render the route changes
  // instead of one render later. Navigation has already happened by the
  // time pathname changes, so this closes instantly rather than replaying
  // MobileDrawer's close animation — a drawer left open after navigating
  // is the real bug to avoid.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />

          <div className="flex-1 flex min-w-0">
            <main className="flex-1 min-w-0">{children}</main>
            {rightRail && <RightRail>{rightRail}</RightRail>}
          </div>
        </div>

        {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
      </div>
    </MotionConfig>
  )
}
