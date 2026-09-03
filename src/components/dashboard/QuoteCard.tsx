'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { QUOTES, type Quote } from '@/data/quotes'

// Hashes a `YYYY-MM-DD` string into a stable index so the same quote shows
// for the whole day (a genuine "quote of the day") instead of reshuffling
// on every render.
function quoteIndexForDate(dateKey: string): number {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % QUOTES.length
}

interface Props {
  /** `'compact'` — the dashboard's small card (default). `'feature'` — the
   *  larger, green-tinted treatment the `/progress` page uses, with a
   *  quote mark, oversized hanzi and a pinyin line. */
  variant?: 'compact' | 'feature'
}

/**
 * Static idiom-of-the-day card. Fully client-side, no backend.
 *
 * The date-derived quote is only resolved client-side, inside a mount
 * effect. `/dashboard` prerenders (static), so calling `new Date()` directly
 * during render would bake in the *build* day's date on the server while
 * the client resolves the *actual* current day the moment those two days
 * differ — a hydration text mismatch. Rendering a fixed default (`QUOTES[0]`)
 * on first paint, identically on server and client, then swapping to the
 * real quote-of-the-day after mount keeps server/client markup identical
 * during hydration.
 */
export function QuoteCard({ variant = 'compact' }: Props) {
  const [quote, setQuote] = useState<Quote>(QUOTES[0])

  useEffect(() => {
    let cancelled = false
    // Deferred via an inner async function (matching the rest of this
    // codebase's data-hook convention, e.g. useTodayStats/useWeeklyActivity)
    // rather than calling setState synchronously in the effect body.
    async function pick() {
      const dateKey = new Date().toISOString().slice(0, 10)
      if (!cancelled) setQuote(QUOTES[quoteIndexForDate(dateKey)])
    }
    pick()
    return () => { cancelled = true }
  }, [])

  if (variant === 'feature') {
    return (
      <Card
        padding="lg"
        className="relative flex h-full flex-col justify-center overflow-hidden"
        style={{ backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent)' }}
      >
        {/* Decorative bamboo motif, echoing the settings header leaf */}
        <svg
          className="pointer-events-none absolute -right-6 -top-4"
          width="180" height="180" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.18 }}
          aria-hidden="true"
        >
          <path d="M12 2v20M12 6c3 0 5-1 6-3M12 11c-3 0-5-1-6-3M12 16c3 0 5-1 6-3M8 21c8 0 14-6 14-14" />
        </svg>

        <span
          className="font-hanzi text-4xl leading-none"
          style={{ color: 'var(--accent-text)' }}
          aria-hidden="true"
        >
          &ldquo;
        </span>

        <h3
          className="font-hanzi mt-2 leading-snug"
          style={{ color: 'var(--hanzi-color)', fontSize: quote.zh.length > 6 ? '1.5rem' : '2rem' }}
        >
          {quote.zh}
        </h3>
        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
          {quote.py}
        </p>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {quote.en}
        </p>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <h3 className="font-hanzi text-lg leading-snug" style={{ color: 'var(--hanzi-color)' }}>
        {quote.zh}
      </h3>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {quote.en}
      </p>
    </Card>
  )
}
