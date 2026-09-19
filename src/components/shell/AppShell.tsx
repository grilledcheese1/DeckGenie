'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'motion/react'
import { Sidebar } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'
import { MobileDrawer } from './MobileDrawer'
import { RightRail } from './RightRail'
import { AppShellSlotsProvider } from './AppShellSlots'

interface Props {
  children: React.ReactNode
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
 *
 * Lives in the shared `(app)/layout.tsx` rather than inside each page, so
 * it (and `Sidebar`) stay mounted across tab clicks — only `children`
 * swaps on navigation. Because pages are no longer `AppShell`'s direct
 * caller, right-rail content (previously a `rightRail` prop) is now
 * published up via the `AppShellSlots` context — see `useRightRail`.
 *
 * Note there is no "hide chrome" equivalent here: a page nested under
 * this shared layout can only ask AppShell to hide its chrome via an
 * effect, which can't run until after AppShell has already committed its
 * normal render — including during SSR, where effects never run at all.
 * A route that must never show this chrome (settings onboarding, see
 * `src/app/onboarding/page.tsx`) has to live outside the `(app)` route
 * group entirely instead.
 */
export function AppShell({ children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [railContent, setRailContent] = useState<ReactNode>(null)
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

  // Memoized: `setRailContent` is stable forever (a useState setter), so
  // this object's identity should be too. Without this, a new `slots`
  // object on every AppShell render would change the context `value`
  // every time, forcing every consumer of `useRightRail` (i.e. the
  // current page) to re-render — which recreates its rail JSX with a new
  // identity, re-triggers that hook's effect, calls `setRailContent`
  // again, re-renders AppShell again, and loops forever ("Maximum update
  // depth exceeded").
  const slots = useMemo(() => ({ setRailContent }), [])

  return (
    <AppShellSlotsProvider value={slots}>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex-1 flex flex-col min-w-0">
            <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />

            <div className="flex-1 flex min-w-0">
              <main className="flex-1 min-w-0">{children}</main>
              {railContent && <RightRail>{railContent}</RightRail>}
            </div>
          </div>

          {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
        </div>
      </MotionConfig>
    </AppShellSlotsProvider>
  )
}
