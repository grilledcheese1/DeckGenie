import type { SignMode } from '@/components/ui/NeonSign'

/**
 * Shared `NeonSign`/`NeonSignH` styling presets — replaces the
 * `color="#51C2BA" glowColor={signMode === 'neon' ? "rgba(0,255,245,0.35)" : undefined}`
 * boilerplate that used to be repeated at every call site.
 */
export const NEON_SIGN_COLOR = '#51C2BA'

export function neonGlowFor(mode: SignMode): string | undefined {
  return mode === 'neon' ? 'rgba(0,255,245,0.35)' : undefined
}

export interface NeonDriftPhrase {
  en: string
  zh: string
}

/**
 * Short two-character idioms for the practice-tab right-rail drifting signs
 * (`NeonSignDrift`). `en` is metadata only — it's kept so these read like the
 * dashboard/auth `NeonSign` call sites, but the drifting signs render with
 * `static` (Chinese only, no typewriter cycle). `NeonSignDrift` uses
 * `slice(0, SIGN_COUNT)`.
 */
export const NEON_DRIFT_PHRASES: NeonDriftPhrase[] = [
  { en: 'PERSIST',    zh: '坚持' },
  { en: 'FOCUS',      zh: '专注' },
  { en: 'PROGRESS',   zh: '进步' },
  { en: 'MEMORY',     zh: '记忆' },
  { en: 'INTUITION',  zh: '语感' },
  { en: 'DILIGENCE',  zh: '勤奋' },
  { en: 'ACCUMULATE', zh: '积累' },
  { en: 'FLUENCY',    zh: '熟练' },
]
