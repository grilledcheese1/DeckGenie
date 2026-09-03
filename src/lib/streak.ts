/**
 * `progress.streak_days` is only recomputed server-side when a round is
 * finished (`complete_round`), so it goes stale between sessions. This
 * applies the same rule the RPC uses — a streak survives only if the last
 * practice was today or yesterday; a gap of 2+ calendar days breaks it —
 * so the UI can show a broken streak immediately instead of a phantom
 * count that lingers until the next completed round.
 *
 * Shared by `StreakCard` (dashboard) and the `/progress` page.
 */

/** Whole calendar days between `iso` and now, in UTC (matches the date
 *  arithmetic the activity hooks use). */
export function daysSince(iso: string): number {
  const last = new Date(iso)
  const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((today - lastDay) / 86_400_000)
}

/** The streak as it stands *right now*: the stored count if practice was
 *  today or yesterday, otherwise 0 (broken). */
export function liveStreak(streakDays: number | undefined, lastPracticedAt: string | null | undefined): number {
  if (!lastPracticedAt) return 0
  return daysSince(lastPracticedAt) >= 2 ? 0 : (streakDays ?? 0)
}
