import { StreakCard } from './StreakCard'
import { DailyGoalCard } from './DailyGoalCard'
import { QuoteCard } from './QuoteCard'
import { RecentVocabCard } from './RecentVocabCard'

/**
 * Composes the dashboard's right-rail widgets. Each card owns its own
 * data-fetching (calling its own hook) rather than this component fetching
 * everything and prop-drilling — matches the pattern `Sidebar` already
 * established by calling `useProgress()`/`useTodayStats()` itself.
 */
export function DashboardRightRail() {
  return (
    <>
      <StreakCard />
      <DailyGoalCard />
      <QuoteCard />
      <RecentVocabCard />
    </>
  )
}
