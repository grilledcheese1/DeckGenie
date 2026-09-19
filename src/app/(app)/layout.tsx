import { AppShell } from '@/components/shell/AppShell'
import { ProgressProvider } from '@/hooks/useProgress'

/**
 * Shared layout for every authenticated route (dashboard/practice/
 * vocabulary/review/progress/settings) — grouped under `(app)` so this
 * layout applies to all of them without affecting their URLs. `AppShell`
 * (and the `Sidebar` it renders) now stay mounted across nav clicks
 * instead of remounting per page, which is the whole point of the route
 * group: see `AppShell`'s own doc comment for what that fixes.
 *
 * `ProgressProvider` wraps `AppShell` (not the other way around) since
 * `Sidebar` calls `useProgress()` and needs the provider above it in the
 * tree.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider>
      <AppShell>{children}</AppShell>
    </ProgressProvider>
  )
}
