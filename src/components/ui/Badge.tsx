export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6
export type PosTag = 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
export type StatusTag = 'good' | 'new' | 'review' | 'almost'

export type BadgeTone =
  | `hsk-${HskLevel}`
  | `pos-${PosTag}`
  | `status-${StatusTag}`

export interface BadgeProps {
  tone: BadgeTone
  children: React.ReactNode
  className?: string
}

// HSK 1-6 — same lookup duplicated verbatim as HSK_BADGE_STYLES in
// VocabCard.tsx and VocabSheet.tsx, generalized into Badge.
const HSK_STYLES: Record<HskLevel, React.CSSProperties> = {
  1: { color: 'var(--hsk-1-color)', backgroundColor: 'var(--hsk-1-bg)', border: '1px solid var(--hsk-1-border)' },
  2: { color: 'var(--hsk-2-color)', backgroundColor: 'var(--hsk-2-bg)', border: '1px solid var(--hsk-2-border)' },
  3: { color: 'var(--hsk-3-color)', backgroundColor: 'var(--hsk-3-bg)', border: '1px solid var(--hsk-3-border)' },
  4: { color: 'var(--hsk-4-color)', backgroundColor: 'var(--hsk-4-bg)', border: '1px solid var(--hsk-4-border)' },
  5: { color: 'var(--hsk-5-color)', backgroundColor: 'var(--hsk-5-bg)', border: '1px solid var(--hsk-5-border)' },
  6: { color: 'var(--hsk-6-color)', backgroundColor: 'var(--hsk-6-bg)', border: '1px solid var(--hsk-6-border)' },
}

// The codebase has no per-part-of-speech color tokens today (VocabSheet's
// POS filter pills are already plain neutral pills, not color-coded per
// type), so every pos-* tone shares one neutral "pill" treatment matching
// that existing unselected-pill look, rather than inventing new hardcoded
// per-type colors that would bypass the theme system.
const POS_STYLE: React.CSSProperties = {
  color: 'var(--text-tertiary)',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
}

// Status tones mirror the accuracy-tier dot colors already hardcoded in
// VocabCard.tsx / VocabSheet.tsx (#10b981 / #f59e0b / #ef4444) rather than
// theme tokens — that's an existing, deliberate convention in this codebase
// for accuracy-tier indicators (good/bad semantics that shouldn't flip
// per-theme). "new" reuses the neutral bucket practice/page.tsx's
// getDifficulty() already uses for words with no data.
const STATUS_STYLES: Record<StatusTag, React.CSSProperties> = {
  new:    { color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' },
  review: { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' },
  almost: { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' },
  good:   { color: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)' },
}

// Status-tag thresholds for the analysis table — mirrors the accuracy math
// already in practice/page.tsx's getDifficulty(). Exported so a later task
// wiring this into the analysis table doesn't need to re-derive it.
export function getWordStatus(timesSeen: number, timesCorrect: number): { tone: BadgeTone; label: string } {
  if (timesSeen <= 0) return { tone: 'status-new', label: 'New word' }
  const accuracy = timesCorrect / timesSeen
  if (accuracy < 0.5) return { tone: 'status-review', label: 'Review this word' }
  if (accuracy < 0.8) return { tone: 'status-almost', label: 'Almost there' }
  return { tone: 'status-good', label: 'Good!' }
}

function resolveToneStyle(tone: BadgeTone): React.CSSProperties {
  if (tone.startsWith('hsk-')) {
    const level = Number(tone.slice(4)) as HskLevel
    return HSK_STYLES[level] ?? POS_STYLE
  }
  if (tone.startsWith('pos-')) {
    return POS_STYLE
  }
  const status = tone.slice('status-'.length) as StatusTag
  return STATUS_STYLES[status] ?? STATUS_STYLES.new
}

/**
 * Generalizes the HSK_BADGE_STYLES lookup duplicated in VocabCard.tsx and
 * VocabSheet.tsx into a single tone-driven badge covering HSK levels,
 * part-of-speech tags, and accuracy status tags.
 */
export function Badge({ tone, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-lg px-1.5 py-0.5 ${className}`}
      style={resolveToneStyle(tone)}
    >
      {children}
    </span>
  )
}
