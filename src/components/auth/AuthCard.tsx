export interface AuthCardProps {
  /** Small uppercase line under the wordmark, e.g. "Practice" / "Create account". */
  subtitle?: string
  /** Centers all content (used by signup's "confirmation sent" state). */
  centered?: boolean
  children: React.ReactNode
}

/**
 * Centered `max-w-sm` card shell shared by login, signup's form state, and
 * signup's "confirmation sent" state — a wordmark + optional subtitle line,
 * then flexible children so it can hold either a form or a static
 * confirmation message, both floating above `AuthLayout`'s backdrop.
 */
export function AuthCard({ subtitle, centered = false, children }: AuthCardProps) {
  return (
    <div
      className={`w-full max-w-sm relative ${centered ? 'text-center' : ''}`}
      style={{ zIndex: 1 }}
    >
      <div className="text-center mb-8">
        <p className="font-hanzi text-5xl mb-2" style={{ color: 'var(--hanzi-color)' }}>音吉</p>
        {subtitle && (
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
