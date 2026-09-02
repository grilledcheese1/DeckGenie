export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value. Combined with `max` to derive the fill percentage. */
  value: number
  /** Defaults to 100, i.e. `value` is already a percentage. */
  max?: number
  /** Track color. Defaults to `var(--bg-tertiary)`, matching existing bars. */
  trackColor?: string
  /** Fill color. Defaults to `var(--accent)`, matching existing bars. */
  fillColor?: string
}

/**
 * The thin rounded track+fill pattern used for round progress, daily goal,
 * and the practice sentence-progress bar.
 *
 * Extends `HTMLAttributes<HTMLDivElement>` and spreads `...rest` onto the
 * outer element so callers can pass `aria-label`/`aria-labelledby` — three
 * instances of this ship on screen (round progress, daily goal, sentence
 * progress) and `role="progressbar"` needs an accessible name to be useful.
 */
export function ProgressBar({
  value,
  max = 100,
  trackColor = 'var(--bg-tertiary)',
  fillColor = 'var(--accent)',
  className = '',
  style,
  ...rest
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div
      className={`w-full h-1.5 rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: trackColor, ...style }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
    </div>
  )
}
