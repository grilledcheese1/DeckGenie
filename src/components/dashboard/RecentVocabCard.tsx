'use client'

import { Card } from '@/components/ui/Card'
import { Badge, type HskLevel } from '@/components/ui/Badge'
import { useRecentVocab } from '@/hooks/useRecentVocab'

/** The 3 most-recently-unlocked vocab words, each with an "x N" usage count. */
export function RecentVocabCard() {
  const { words, loading, error } = useRecentVocab()

  return (
    <Card padding="md">
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        Recently unlocked
      </p>

      {loading && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
      )}

      {!loading && error && (
        <p className="text-xs" style={{ color: 'var(--error-text)' }}>Couldn&#39;t load vocab.</p>
      )}

      {!loading && !error && words.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No words unlocked yet.</p>
      )}

      {!loading && !error && words.length > 0 && (
        <ul className="space-y-2.5">
          {words.map(word => (
            <li key={word.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-hanzi text-base flex-shrink-0" style={{ color: 'var(--hanzi-color)' }}>
                  {word.word_zh}
                </span>
                <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {word.english}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge tone={`hsk-${word.hsk_level as HskLevel}`}>HSK {word.hsk_level}</Badge>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  x{word.times_seen}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
