'use client'

import { useEffect } from 'react'
import { loadSavedTheme } from '@/lib/theme'

export function ThemedLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    loadSavedTheme()
  }, [])

  return <>{children}</>
}
