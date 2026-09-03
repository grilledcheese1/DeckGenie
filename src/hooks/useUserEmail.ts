'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'

const EMAIL_KEY   = 'hanzi_user_email'
const EMAIL_EVENT = 'hanzi-user-email-change'

/**
 * The signed-in user's email, cached in `localStorage` so it paints
 * instantly on every navigation instead of flashing a placeholder
 * ("Account" / "there") while a network round-trip resolves.
 *
 * Modelled as an external store: server snapshot is `null` (matches the
 * SSR markup — no hydration mismatch), client snapshot is the cached
 * value. A mount effect refreshes it from the cached session
 * (`getSession()` — reads local storage, **no** network `getUser()` call)
 * and only *writes* the cache when it has a real email, so a transient
 * `null` can never flash the placeholder. Clearing on sign-out is explicit
 * via `clearCachedEmail()`.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(EMAIL_EVENT, onChange)
  window.addEventListener('storage', onChange)   // keep other tabs in sync
  return () => {
    window.removeEventListener(EMAIL_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getSnapshot(): string | null {
  try { return localStorage.getItem(EMAIL_KEY) } catch { return null }
}

function getServerSnapshot(): string | null {
  return null
}

/** Drop the cached email (call on sign-out). */
export function clearCachedEmail() {
  try { localStorage.removeItem(EMAIL_KEY) } catch {}
  window.dispatchEvent(new Event(EMAIL_EVENT))
}

export function useUserEmail(): string | null {
  const email = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    let cancelled = false
    createClient().auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        const next = session?.user?.email
        if (!next || next === getSnapshot()) return
        try { localStorage.setItem(EMAIL_KEY, next) } catch {}
        window.dispatchEvent(new Event(EMAIL_EVENT))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return email
}
