'use client'

interface Props {
  /** 0-100 grading score. */
  score: number
  /** Ring diameter in px. Default 72. */
  size?: number
}

/**
 * Circular SVG progress ring showing the grade's score as a percentage in
 * the center. Same stroke-dasharray/stroke-dashoffset technique as
 * `InkButton`'s enso ring, but a plain circle (not the hand-drawn enso path)
 * since this is a data visualization, not a decorative brush stroke.
 *
 * A CSS transition on `stroke-dashoffset` is sufficient here — no GSAP
 * needed for a single static value that's already known on mount.
 */
export function ScoreRing({ score, size = 72 }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score: ${clamped} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <span
        className="absolute font-medium tabular-nums"
        style={{ fontSize: size * 0.24, color: 'var(--text-primary)' }}
      >
        {clamped}%
      </span>
    </div>
  )
}
