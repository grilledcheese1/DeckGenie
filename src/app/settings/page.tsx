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

  return (
    <div className="min-h-screen px-4 py-10 max-w-lg mx-auto">
      <SettingsForm
        mode={isFirstRun ? 'onboarding' : 'edit'}
        onDone={() => router.push('/dashboard')}
        onBack={isFirstRun ? undefined : () => router.back()}
        highlightApiKey={highlightApiKey}
      />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppShell>
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
    </AppShell>
  )
}
