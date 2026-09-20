'use client'

import { LeafGlyph } from './icons'
import type { Settings } from '@/types'

interface Props {
  vocabCount: number
  hskLevel: Settings['starting_hsk'] | undefined
}

/**
 * Title + subtitle, the read-only HSK chip (deliberately no chevron/select
 * affordance -- see Decision 5 in the design doc, this is display-only),
 * and the "Small steps · Big progress" wordmark from the mockup.
 */
export function VocabPageHeader({ vocabCount, hskLevel }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Vocabulary</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Build, search, and manage your Chinese vocabulary.
        </p>
      </div>

      <div className="flex items-start gap-6 flex-shrink-0">
        <div className="text-right">
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            HSK {hskLevel ?? 1}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{vocabCount} words active</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <p
            className="text-[10px] font-semibold uppercase leading-tight text-right"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
          >
            Small steps<br />Big progress
          </p>
          <LeafGlyph width={20} height={20} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}
