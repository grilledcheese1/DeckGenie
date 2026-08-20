import { Card } from '@/components/ui/Card'
import type { GrammarFocus } from '@/types'

interface Props {
  grammarFocus: GrammarFocus | null | undefined
}

/**
 * Renders `GradeResponse.grammarFocus` — pattern/pinyin heading,
 * explanation body, and a small example block. `grammarFocus` is nullable
 * (not yet generated for this sentence, or Claude's analysis degraded
 * gracefully), so this always renders a graceful fallback rather than an
 * empty/broken card.
 */
export function GrammarFocusCard({ grammarFocus }: Props) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Grammar focus
      </p>
      {!grammarFocus ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Not available for this sentence yet.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
              {grammarFocus.pattern}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>
              {grammarFocus.pinyin}
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {grammarFocus.explanation}
          </p>
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--bg-tertiary)', border: '0.5px solid var(--border)' }}
          >
            <p className="font-hanzi text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {grammarFocus.example.zh}
            </p>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {grammarFocus.example.pinyin}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {grammarFocus.example.en}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
