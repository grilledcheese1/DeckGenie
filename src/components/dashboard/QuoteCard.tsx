'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { QUOTES, type Quote } from '@/data/quotes'

// Random pick computed once via useState's lazy initializer, so it's stable
// for the component's lifetime instead of re-randomizing on every re-render.
function pickQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}

/** Static idiom-of-the-moment card. Fully client-side, no backend. */
export function QuoteCard() {
  const [quote] = useState<Quote>(pickQuote)

  return (
    <Card padding="md">
      <p className="font-hanzi text-lg leading-snug" style={{ color: 'var(--hanzi-color)' }}>
        {quote.zh}
      </p>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {quote.en}
      </p>
    </Card>
  )
}
