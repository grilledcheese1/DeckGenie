import { QuoteCard } from '@/components/dashboard/QuoteCard'

/**
 * Normal practice mode's right rail. Kept deliberately lightweight — a
 * single idiom-of-the-day card (the same static `QUOTES` deck / component
 * the dashboard already uses), rather than duplicating that pattern.
 */
export function PracticeRightRail() {
  return <QuoteCard />
}
