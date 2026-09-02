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
