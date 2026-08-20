'use client'

import { NeonSign } from '@/components/ui/NeonSign'
import type { SignMode } from '@/components/ui/NeonSign'
import { NeonSignH } from '@/components/ui/NeonSignH'

export type AuthLayoutVariant = 'primary' | 'confirmation'

interface AuthLayoutProps {
  children: React.ReactNode
  signMode: SignMode
  /**
   * 'primary' is the dimmed 6-sign backdrop behind the login/signup forms.
   * 'confirmation' is signup's brighter, sparser "check your email" backdrop.
   */
  variant?: AuthLayoutVariant
}

function glowFor(signMode: SignMode) {
  return signMode === 'neon' ? 'rgba(0,255,245,0.35)' : undefined
}

function PrimarySigns({ signMode }: { signMode: SignMode }) {
  const glowColor = glowFor(signMode)
  return (
    <>
      {/* Left Side */}
      <NeonSign english="INKITSU"  chinese="音吉" color="#51C2BA" glowColor={glowColor} size={4} delay={0} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '-40%', top: '6%' }} />
      <NeonSign english="PERSIST"  chinese="坚持" color="#51C2BA" glowColor={glowColor} size={3} delay={1.4} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '-27%', top: '-41%' }} />
      <NeonSignH english="PROGRESS" chinese="进步" color="#51C2BA" glowColor={glowColor} size={2.5} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '4%', bottom: '39%' }} />

      {/* Right Side */}
      <NeonSign english="REFLECT" chinese="温故知新" color="#51C2BA" glowColor={glowColor} size={3.5} delay={.5} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ right: '-38%', top: '-102%' }} />
      <NeonSign english="ORDER" chinese="循序渐进" color="#51C2BA" glowColor={glowColor} size={2.2} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '27%', bottom: '170%' }} />
      <NeonSign english="LEARNING WITHOUT THINKING IS USELESS" chinese="学而不思则罔，思而不学则殆 " color="#51C2BA" glowColor={glowColor} size={1} delay={2.8} mode={signMode} fadeInDuration={1.5} className="absolute" style={{ left: '27%', bottom: '168%' }} />
    </>
  )
}

function ConfirmationSigns({ signMode }: { signMode: SignMode }) {
  const glowColor = glowFor(signMode)
  return (
    <>
      <NeonSign english="STUDY"    chinese="学习" color="#51C2BA" glowColor={glowColor} size={1} delay={0}   mode={signMode} className="absolute" style={{ left: '4%',  top: '8%' }} />
      <NeonSign english="PERSIST"  chinese="坚持" color="#51C2BA" glowColor={glowColor} size={1} delay={1.4} mode={signMode} className="absolute" style={{ right: '4%', top: '15%' }} />
      <NeonSign english="PROGRESS" chinese="进步" color="#51C2BA" glowColor={glowColor} size={1} delay={2.8} mode={signMode} className="absolute" style={{ left: '6%',  bottom: '12%' }} />
    </>
  )
}

/**
 * Shared full-height centering shell + decorative NeonSign backdrop for the
 * unauthenticated login/signup screens. Both pages stay outside `AppShell`
 * (no sidebar) since there's no signed-in user yet.
 *
 * Only two sign configurations exist across the app's 3 call sites (login,
 * signup's form state, signup's "confirmation sent" state — the first two
 * share the same dimmed 6-sign set) so they're hardcoded here behind a
 * `variant` prop rather than accepting arbitrary sign children/config —
 * avoids over-engineering a prop API nothing else needs.
 */
export function AuthLayout({ children, signMode, variant = 'primary' }: AuthLayoutProps) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: variant === 'primary' ? 0.13 : undefined, zIndex: 0 }}
        aria-hidden="true"
      >
        {variant === 'primary'
          ? <PrimarySigns signMode={signMode} />
          : <ConfirmationSigns signMode={signMode} />}
      </div>
      {children}
    </div>
  )
}
