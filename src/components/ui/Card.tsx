export type CardPadding = 'sm' | 'md' | 'lg' | 'xl'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-8',
}

/**
 * The `rounded-2xl` / `var(--bg-secondary)` / `var(--border)` container
 * pattern repeated across dashboard, summary, and review cards.
 */
export function Card({ padding = 'md', className = '', style, children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl ${PADDING_CLASSES[padding]} ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
