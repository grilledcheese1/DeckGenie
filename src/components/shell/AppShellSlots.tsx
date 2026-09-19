'use client'

import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'

interface AppShellSlotsValue {
  setRailContent: (node: ReactNode) => void
}

const AppShellSlotsContext = createContext<AppShellSlotsValue | null>(null)

export function AppShellSlotsProvider({
  value,
  children,
}: {
  value: AppShellSlotsValue
  children: ReactNode
}) {
  return <AppShellSlotsContext.Provider value={value}>{children}</AppShellSlotsContext.Provider>
}

function useAppShellSlots() {
  const ctx = useContext(AppShellSlotsContext)
  if (!ctx) throw new Error('AppShellSlots hooks must be used within AppShell')
  return ctx
}

/**
 * Publishes a page's right-rail content up to the shared `AppShell` — the
 * replacement for the old `rightRail` prop, which stopped working once
 * `AppShell` moved into a layout and pages are no longer its direct
 * caller. Runs in `useLayoutEffect` (not `useEffect`) so the rail swaps in
 * the same paint as the route change instead of flashing the previous
 * page's content for a frame first. Clears itself on unmount so
 * navigating to a page that calls this with no rail (or doesn't call it
 * at all) never leaves a previous page's rail content stuck on screen.
 */
export function useRightRail(node: ReactNode) {
  const { setRailContent } = useAppShellSlots()
  useLayoutEffect(() => {
    setRailContent(node)
    return () => setRailContent(null)
  }, [setRailContent, node])
}
