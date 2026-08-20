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
export function QuoteCard() {
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
