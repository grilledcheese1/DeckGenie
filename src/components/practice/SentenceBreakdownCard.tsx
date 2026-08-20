import { Card } from '@/components/ui/Card'
import type { SentenceStructureSegment } from '@/types'

interface Props {
  segments: SentenceStructureSegment[] | null | undefined
}

const ROLE_LABELS: Record<SentenceStructureSegment['role'], string> = {
  S:     'Subject',
  V:     'Verb',
  O:     'Object',
  Q:     'Particle',
  MW:    'Measure word',
  Other: 'Other',
}

/**
 * Renders `GradeResponse.sentenceStructure` — a simple row of
 * segment+role-badge pairs. `sentenceStructure` is nullable (not yet
 * cached/generated for this sentence, or a pre-migration deploy), so this
 * always renders a graceful fallback rather than an empty/broken card.
 */
export function SentenceBreakdownCard({ segments }: Props) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Sentence structure
      </p>
      {!segments || segments.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Not available for this sentence yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-2"
              style={{ background: 'var(--bg-tertiary)', border: '0.5px solid var(--border)' }}
            >
              <span className="font-hanzi text-base leading-none" style={{ color: 'var(--text-primary)' }}>
                {seg.segment}
              </span>
              <span
                className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--accent-text)' }}
                title={ROLE_LABELS[seg.role]}
              >
                {seg.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
