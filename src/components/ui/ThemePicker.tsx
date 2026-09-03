'use client'

import { THEMES, applyTheme, type ThemeId } from '@/lib/theme'

interface Props {
  selected: ThemeId
  onChange: (id: ThemeId) => void
  /** Hide the internal "Choose your theme" label when a parent already
   *  supplies a heading (e.g. the settings Theme card). */
  showLabel?: boolean
}

export function ThemePicker({ selected, onChange, showLabel = true }: Props) {
  return (
    <div className="w-full">
      {showLabel && (
        <p
          style={{ color: 'var(--text-tertiary)' }}
          className="text-xs uppercase tracking-widest mb-3"
        >
          Choose your theme
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(theme => {
          const isSelected = selected === theme.id
          const p = theme.preview
          return (
            <button
              key={theme.id}
              onClick={() => {
                applyTheme(theme.id)
                onChange(theme.id)
              }}
              className="relative rounded-2xl transition-all"
              style={{ background: 'transparent', outline: 'none' }}
              aria-label={`Select ${theme.name} theme`}
              aria-pressed={isSelected}
            >
              {/* Accent frame — wraps only the preview, not the name */}
              <div
                className="rounded-xl p-0.5"
                style={{ background: isSelected ? p.accent : 'transparent' }}
              >
              {/* Mini app preview */}
              <div
                className="rounded-[10px] overflow-hidden w-full"
                style={{
                  background: p.bg,
                  border: `0.5px solid ${p.border}`,
                  padding: '8px',
                }}
              >
                {/* Mock header */}
                <div
                  className="font-hanzi text-base leading-none mb-1.5"
                  style={{ color: p.hanzi }}
                >
                  音吉
                </div>

                {/* Mock card */}
                <div
                  className="rounded-lg px-2 py-1.5 mb-1.5"
                  style={{
                    background: p.bgCard,
                    border: `0.5px solid ${p.border}`,
                  }}
                >
                  <div
                    className="text-xs font-hanzi leading-tight"
                    style={{ color: p.text }}
                  >
                    喝茶
                  </div>
                  <div
                    className="text-[9px] mt-0.5"
                    style={{ color: p.textMuted }}
                  >
                    hē chá
                  </div>
                </div>

                {/* Mock button */}
                <div
                  className="rounded-lg py-1 text-center text-[9px] font-medium"
                  style={{
                    background: p.accent,
                    color: p.accentText,
                  }}
                >
                  Submit
                </div>
              </div>
              </div>

              {/* Theme name below preview */}
              <p
                className="text-[10px] font-medium mt-1.5 mb-1 text-center leading-tight px-1"
                style={{
                  color: isSelected ? p.accent : 'var(--text-tertiary)',
                }}
              >
                {theme.name}
              </p>

              {/* Selected checkmark */}
              {isSelected && (
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: p.accent }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke={p.accentText}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
