'use client'

import { useRouter } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'

/**
 * First-run settings onboarding for a brand-new user (routed here from
 * `auth/callback` and `signup` right after account creation, before any
 * vocab has been seeded). Deliberately lives OUTSIDE the `(app)` route
 * group — not just visually without the shared `AppShell` chrome, but
 * never nested under that layout at all.
 *
 * That distinction matters: a brand-new user must not be able to leave
 * via the sidebar's nav/sign-out before their settings are saved (which
 * is what seeds their vocab in `SettingsForm.handleSave`). Next.js
 * layouts can't read `searchParams`, and a page can't unwrap a parent
 * layout — so hiding `AppShell`'s chrome from inside a page nested under
 * it can only happen via an effect, after the shell has already
 * committed its normal (chrome-visible) render. Both entry points here
 * are hard navigations (a server redirect, and `window.location.href`),
 * so that first commit is a real page load — the sidebar (with sign-out)
 * would be visible, and clickable, before any effect could hide it.
 * Living outside `(app)` avoids the problem entirely: `AppShell` is
 * simply never part of this route's tree, on the server or the client.
 */
export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-3xl mx-auto">
      <SettingsForm
        mode="onboarding"
        onDone={() => router.push('/dashboard')}
      />
    </div>
  )
}
