import { QuoteCard } from '@/components/dashboard/QuoteCard'
import { NeonSignDrift } from './NeonSignDrift'

/**
 * Normal practice mode's right rail: the idiom-of-the-day card (same
 * static `QUOTES` deck the dashboard uses), plus a bounded panel of
 * slowly drifting, grab-and-fling neon signs filling the space beneath it.
 */
export function PracticeRightRail() {
  return (
    <>
      <QuoteCard />
      <NeonSignDrift />
    </>
  )
}
