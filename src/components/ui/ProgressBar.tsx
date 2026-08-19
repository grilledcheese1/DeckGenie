export interface ProgressBarProps {
  /** Current value. Combined with `max` to derive the fill percentage. */
  value: number
  /** Defaults to 100, i.e. `value` is already a percentage. */
  max?: number
  /** Track color. Defaults to `var(--bg-tertiary)`, matching existing bars. */
  trackColor?: string
  /** Fill color. Defaults to `var(--accent)`, matching existing bars. */
  fillColor?: string
  className?: string
}

/**
 * The thin rounded track+fill pattern used for round progress, daily goal,
 * and the practice sentence-progress bar.
 */
export function ProgressBar({
  value,
  max = 100,
  trackColor = 'var(--bg-tertiary)',
  fillColor = 'var(--accent)',
  className = '',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div
      className={`w-full h-1.5 rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: trackColor }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
    </div>
  )
}
