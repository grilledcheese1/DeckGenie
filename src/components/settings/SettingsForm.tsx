'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { loadSavedTheme, type ThemeId } from '@/lib/theme'

const HSK_DESCRIPTIONS: Record<number, string> = {
  1: 'Complete beginner — ~150 basic words',
  2: 'Elementary — ~300 words, simple sentences',
  3: 'Pre-intermediate — ~600 words',
  4: 'Intermediate — ~1200 words',
  5: 'Upper-intermediate — ~2500 words',
  6: 'Advanced — ~5000 words',
}

const STRICTNESS_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: 'Lenient',  desc: 'Core meaning counts, phrasing is flexible' },
  2: { label: 'Balanced', desc: 'Meaning clear, minor phrasing ok' },
  3: { label: 'Strict',   desc: 'Precise and idiomatic translations only' },
}

interface Props {
  mode: 'onboarding' | 'edit'
  onDone: () => void
  onBack?: () => void
}

export function SettingsForm({ mode, onDone, onBack }: Props) {
  const isFirstRun = mode === 'onboarding'
  const supabase = createClient()

  const [settings, setSettings] = useState<Partial<Settings>>({
    starting_hsk: 2, strictness: 2, sentences_per_round: 10,
    rounds_before_unlock: 3, words_per_unlock: 5,
    show_pinyin: 'tap', show_hints: 'after',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [theme, setTheme] = useState<ThemeId>('ink-jade')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
          if (data) {
            if (!cancelled) {
              setSettings(data)
              localStorage.setItem('hanzi_settings', JSON.stringify(data))
              setLoaded(true)
            }
            return
          }
        }
      } catch {}
      if (cancelled) return
      const cached = localStorage.getItem('hanzi_settings')
      if (cached) { try { setSettings(JSON.parse(cached)) } catch {} }
      setLoaded(true)
    }
    loadSettings()
    return () => { cancelled = true }
  }, [supabase])
  useEffect(() => { setTheme(loadSavedTheme()) }, [])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from('settings').upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' })
        if (error) { setSaveError(error.message); setSaving(false); return }
      }
    } catch (e) { setSaveError(String(e)); setSaving(false); return }
    localStorage.setItem('hanzi_settings', JSON.stringify(settings))
    if (isFirstRun) {
      try {
        await fetch('/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hsk_level: settings.starting_hsk, exclude_zh: [], count: 20 }),
        })
      } catch {}
    }
    onDone()
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const selectedChip: React.CSSProperties = {
    backgroundColor: 'var(--accent-subtle)',
    border: '1px solid var(--accent)',
    color: 'var(--accent-text)',
  }
  const unselectedChip: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-tertiary)',
  }

  return (
    <>
      <div className="mb-10">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm mb-6 flex items-center gap-1.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
          {isFirstRun
            ? <span>Welcome to <span className="font-hanzi" style={{ color: 'var(--hanzi-color)' }}>汉字练习</span></span>
            : 'Settings'}
        </h1>
        {isFirstRun && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Tell us where you want to start — you can change this any time.
          </p>
        )}
      </div>

      {!loaded && (
        <div className="flex justify-center py-12">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {loaded && (
      <>
      <div className="space-y-8">
        {/* HSK level */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
            {isFirstRun ? 'Starting level' : 'HSK level'}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[1,2,3,4,5,6].map(level => (
              <button
                key={level}
                onClick={() => update('starting_hsk', level as Settings['starting_hsk'])}
                className="rounded-xl py-3 text-center text-sm font-medium transition-all hover-border"
                style={settings.starting_hsk === level ? selectedChip : unselectedChip}
              >
                HSK {level}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
            {HSK_DESCRIPTIONS[settings.starting_hsk ?? 2]}
          </p>
        </section>

        {/* Grading strictness */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Grading strictness
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(level => {
              const s = STRICTNESS_LABELS[level]
              const isSelected = settings.strictness === level
              return (
                <button
                  key={level}
                  onClick={() => update('strictness', level as Settings['strictness'])}
                  className="rounded-xl p-3 text-left transition-all hover-border"
                  style={isSelected ? selectedChip : unselectedChip}
                >
                  <p className="text-sm font-medium" style={{ color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)' }}>
                    {s.label}
                  </p>
                  <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                    {s.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Session */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Session
          </h2>
          <div
            className="space-y-1 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            {[
              { label: 'Sentences per round', key: 'sentences_per_round' as const, min: 5,  max: 20 },
              { label: 'Rounds before unlock', key: 'rounds_before_unlock' as const, min: 1, max: 10 },
              { label: 'New words per unlock',  key: 'words_per_unlock' as const,   min: 1, max: 10 },
            ].map(({ label, key, min, max }, i, arr) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3.5"
                style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}
              >
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => update(key, Math.max(min, (settings[key] as number) - 1) as never)}
                    className="w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors hover-bg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {settings[key] as number}
                  </span>
                  <button
                    onClick={() => update(key, Math.min(max, (settings[key] as number) + 1) as never)}
                    className="w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-colors hover-bg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Display */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Display
          </h2>
          <div
            className="space-y-1 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show pinyin</span>
              <div className="flex gap-1">
                {(['always','tap','never'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => update('show_pinyin', v)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize"
                    style={settings.show_pinyin === v ? selectedChip : { ...unselectedChip, border: '1px solid transparent' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show vocab hints</span>
              <div className="flex gap-1">
                {(['before','after','never'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => update('show_hints', v)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize"
                    style={settings.show_hints === v ? selectedChip : { ...unselectedChip, border: '1px solid transparent' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Theme
          </h2>
          <ThemePicker selected={theme} onChange={setTheme} />
        </section>
      </div>

      <div className="mt-10">
        {saveError && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>
            {saveError}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full disabled:opacity-50 font-medium rounded-xl py-3.5 text-sm transition-colors hover-accent"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <span
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid white', borderTopColor: 'transparent' }}
                />
                Saving…
              </span>
            : isFirstRun ? 'Start practicing →' : 'Save settings'}
        </button>
      </div>
      </>
      )}
    </>
  )
}
