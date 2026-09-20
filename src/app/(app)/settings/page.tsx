'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { useProgress } from '@/hooks/useProgress'

function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightApiKey = searchParams.get('focus') === 'apikey'
  const { reload } = useProgress()

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-3xl mx-auto">
      <SettingsForm
        mode="edit"
        onDone={() => router.back()}
        highlightApiKey={highlightApiKey}
        onSaved={reload}
      />
    </div>
  )
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
