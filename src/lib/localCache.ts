/**
 * Thin localStorage read/write helpers shared by the dashboard's
 * session-persistence hooks (useProgress, useTodayStats, useWeeklyActivity,
 * useRecentVocab). Each hook hydrates its React state from here synchronously
 * on mount — so a returning visit renders last-known values immediately
 * instead of a blocking spinner — then silently refetches and overwrites
 * the cache in the background.
 *
 * Not user-scoped by key (same tradeoff `useProgress`'s pre-existing
 * PROGRESS_KEY/SETTINGS_KEY already made): last writer wins, and a
 * stale/wrong-account value only survives until the next successful fetch
 * overwrites it.
 */
export function readLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch { return null }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
