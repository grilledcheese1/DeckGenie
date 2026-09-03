import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
  /**
   * `stack` — header on top, control full-width below (HSK / strictness /
   * practice mode). `split` — header on the left, control on the right,
   * side by side above `md` (session / display / theme). Matches the
   * settings.png layout.
   */
  layout?: 'stack' | 'split'
}

/**
 * One settings group rendered as a large rounded card: a circular
 * accent-tinted icon badge, a title + one-line description, and the
 * control itself. Purely presentational — every consumer owns its own
 * state.
 */
export function SettingCard({ icon, title, description, children, layout = 'stack' }: Props) {
  const header = (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      </div>
    </div>
  )

  return (
    <section
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      {layout === 'split' ? (
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="md:w-60 md:flex-shrink-0">{header}</div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        <>
          {header}
          <div className="mt-5">{children}</div>
        </>
      )}
    </section>
  )
}
