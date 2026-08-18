const STORAGE_KEY = 'hanzi_anthropic_key'

export function saveApiKey(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, key)
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
