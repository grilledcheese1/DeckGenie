interface Props {
  /** `沉浸式学习` subtitle line under the wordmark. Default true (Sidebar,
   * MobileDrawer); MobileTopBar passes false for its compact single-line bar. */
  subtitle?: boolean
  size?: 'base' | 'lg'
}

/**
 * `inkitsu` wordmark (+ optional `.font-hanzi` subtitle). Shared by
 * `Sidebar`, `MobileDrawer`, and `MobileTopBar` — previously duplicated
 * verbatim between `Sidebar` and `MobileDrawer`.
 */
export function Wordmark({ subtitle = true, size = 'lg' }: Props) {
  return (
    <div>
      <p
        className={`font-semibold tracking-tight ${size === 'lg' ? 'text-lg' : 'text-base'}`}
        style={{ color: 'var(--text-primary)' }}
      >
        inkitsu
      </p>
      {subtitle && (
        <p className="font-hanzi text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          沉浸式学习
        </p>
      )}
    </div>
  )
}
