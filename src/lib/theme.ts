export type ThemeId = 'ink-jade' | 'vermillion-cream' | 'bamboo-light'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  preview: {
    bg: string
    bgCard: string
    border: string
    accent: string
    accentText: string
    text: string
    textMuted: string
    hanzi: string
  }
}

export const THEMES: Theme[] = [
  {
    id: 'ink-jade',
    name: 'Ink & Jade',
    description: 'Dark and focused. Easy on the eyes.',
    preview: {
      bg:         '#0c0a09',
      bgCard:     '#1c1917',
      border:     '#292524',
      accent:     '#059669',
      accentText: '#6ee7b7',
      text:       '#f5f5f4',
      textMuted:  '#a8a29e',
      hanzi:      '#34d399',
    },
  },
  {
    id: 'vermillion-cream',
    name: 'Vermillion & Cream',
    description: 'Warm and traditional. Culturally rich.',
    preview: {
      bg:         '#fdf6ec',
      bgCard:     '#f5ead8',
      border:     '#e8d5b7',
      accent:     '#c0392b',
      accentText: '#fdf6ec',
      text:       '#2c1810',
      textMuted:  '#9a7c5a',
      hanzi:      '#c0392b',
    },
  },
  {
    id: 'bamboo-light',
    name: 'Bamboo Light',
    description: 'Clean and minimal. Great for daytime.',
    preview: {
      bg:         '#f9fafb',
      bgCard:     '#f3f4f6',
      border:     '#e5e7eb',
      accent:     '#4d7c5f',
      accentText: '#ffffff',
      text:       '#1a1a1a',
      textMuted:  '#6b7280',
      hanzi:      '#4d7c5f',
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'ink-jade'

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem('hanzi-theme', id)
}

export function loadSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const saved = localStorage.getItem('hanzi-theme') as ThemeId | null
  const theme = saved ?? DEFAULT_THEME
  applyTheme(theme)
  return theme
}
