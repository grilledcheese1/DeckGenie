'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { AppShell } from '@/components/shell/AppShell'

function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstRun = searchParams.get('firstRun') === 'true'
  const highlightApiKey = searchParams.get('focus') === 'apikey'

  const form = (
    <div className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-3xl mx-auto">
      <SettingsForm
        mode={isFirstRun ? 'onboarding' : 'edit'}
        onDone={isFirstRun ? () => router.push('/dashboard') : () => router.back()}
        highlightApiKey={highlightApiKey}
      />
    </div>
  )

  // Onboarding intentionally has no "Back" button so a brand-new user can't
  // leave without picking their settings (which is what seeds their vocab
  // in SettingsForm.handleSave). AppShell's sidebar would reintroduce that
  // escape hatch — 5 nav links plus a sign-out — on a user's very first
  // authenticated screen, so onboarding renders without it. Non-onboarding
  // visits (from the sidebar's own Settings link, or a direct URL) keep the
  // AppShell wrap since /settings is a persistent nav destination there.
  if (isFirstRun) return form

  return <AppShell>{form}</AppShell>
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-5 h-5 rounded-full animate-spin"
          style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <SettingsInner />
    </Suspense>
  )
}
