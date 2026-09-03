'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { SentenceAttempt } from '@/types'

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 45) return 'Just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** First Han character of the sentence, for the row avatar. */
function firstHan(s: string): string {
  const m = s.match(/\p{Script=Han}/u)
  return m ? m[0] : (s.trim()[0] ?? '?')
}

export function RecentSessionsCard({ sessions, loading, error }: {
  sessions: SentenceAttempt[]
  loading: boolean
  error: string | null
}) {
  return (
    <Card padding="lg" className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent sessions</h2>
        <Link
          href="/review"
          className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors hover-bg"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          View all
        </Link>
      </div>

      {error ? (
        <p className="py-6 text-xs" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load sessions: {error}
        </p>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="h-4 w-4 animate-spin rounded-full" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          No practice yet. Your graded sentences will show up here.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sessions.map((s, i) => {
            const pct = Math.round(s.score)
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 py-2.5"
                style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg font-hanzi text-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--hanzi-color)' }}
                  aria-hidden="true"
                >
                  {firstHan(s.sentence_zh)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-hanzi text-sm" style={{ color: 'var(--text-primary)' }}>
                    {s.sentence_zh}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {s.sentence_py}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {timeAgo(s.attempted_at)}
                </span>
                <span
                  className="flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: s.correct ? 'var(--accent-subtle)' : 'var(--error-bg)',
                    color: s.correct ? 'var(--accent-text)' : 'var(--error-text)',
                  }}
                >
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
