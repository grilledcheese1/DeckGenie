'use client'

import { useSyncExternalStore } from 'react'
import type { SignMode } from '@/components/ui/NeonSign'
import { THEME_CHANGE_EVENT, themeToSignMode, type ThemeId } from '@/lib/theme'

/**
 * Live neon-sign visual mode (`neon` / `vermillion` / `bamboo`) derived from
 * the active theme. Modelled as an external store: the server snapshot is
 * `'neon'` (matches the SSR / first-paint markup), the client snapshot reads
 * the saved theme, and it re-reads on `THEME_CHANGE_EVENT` (dispatched by
 * `applyTheme` when Settings changes the theme without a reload).
 *
 * Same intent as the inline pattern the dashboard uses for its background
 * `NeonSign`s; extracted so `NeonSignDrift` isn't a third copy.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
}

function getSnapshot(): SignMode {
  return themeToSignMode((localStorage.getItem('hanzi-theme') ?? 'ink-jade') as ThemeId)
}

function getServerSnapshot(): SignMode {
  return 'neon'
}

export function useSignMode(): SignMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
