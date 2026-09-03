import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { ScoreRing } from '@/components/practice/ScoreRing'

interface Props {
  label: string
  value: string
  hint: string
  hintTone?: 'accent' | 'muted'
  /** Roundel icon — shown when this isn't the featured (ring) card. */
  icon?: ReactNode
  /** 0-100. When set, the card is the featured variant: a `ScoreRing`
   *  instead of an icon, an accent border and a soft glow. */
  ring?: number
}

export function ProgressStatCard({ label, value, hint, hintTone = 'muted', icon, ring }: Props) {
  const hintColor = hintTone === 'accent' ? 'var(--accent-text)' : 'var(--text-tertiary)'

  if (ring !== undefined) {
    return (
      <Card
        padding="lg"
        className="flex h-full items-center gap-6"
        style={{ borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent), 0 0 32px -12px var(--accent)' }}
      >
        <ScoreRing score={ring} size={96} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {label}
          </p>
          <p className="mt-1 text-4xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
          <p className="mt-1.5 text-sm font-medium" style={{ color: hintColor }}>
            {hint}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="flex h-full flex-col">
      {icon && (
        <div
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: hintColor }}>
        {hint}
      </p>
    </Card>
  )
}
