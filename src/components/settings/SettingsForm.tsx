'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { loadSavedTheme, type ThemeId } from '@/lib/theme'
import { saveApiKey, getApiKey } from '@/lib/byoKey'
import { SettingCard } from './SettingCard'
import {
  HskIcon, StrictnessIcon, PracticeModeIcon, SessionIcon, DisplayIcon, ThemeIcon,
  LenientIcon, BalancedIcon, StrictIcon, FreeSentenceIcon, KeyIcon, CheckIcon, SaveIcon,
} from './settingsIcons'

const HSK_DESCRIPTIONS: Record<number, string> = {
  1: 'Complete beginner — ~150 basic words',
  2: 'Elementary — ~300 words, simple sentences',
  3: 'Pre-intermediate — ~600 words',
  4: 'Intermediate — ~1200 words',
  5: 'Upper-intermediate — ~2500 words',
  6: 'Advanced — ~5000 words',
}

const STRICTNESS_OPTIONS: { value: 1 | 2 | 3; label: string; desc: string; icon: ReactNode }[] = [
  { value: 1, label: 'Lenient',  desc: 'Core meaning counts, phrasing is flexible', icon: <LenientIcon /> },
  { value: 2, label: 'Balanced', desc: 'Meaning clear, minor phrasing ok',          icon: <BalancedIcon /> },
  { value: 3, label: 'Strict',   desc: 'Precise and idiomatic translations only',   icon: <StrictIcon /> },
]

const PRACTICE_MODE_OPTIONS: { value: 'static' | 'ai'; label: string; desc: string; icon: ReactNode }[] = [
  { value: 'static', label: 'Free sentences',            desc: 'Pre-written sentences, no key needed', icon: <FreeSentenceIcon /> },
  { value: 'ai',     label: 'My own Anthropic API key',  desc: 'AI-generated sentences using your key', icon: <KeyIcon /> },
]

const SESSION_ROWS: { label: string; key: 'sentences_per_round' | 'rounds_before_unlock' | 'words_per_unlock'; min: number; max: number }[] = [
  { label: 'Sentences per round',  key: 'sentences_per_round',  min: 5, max: 20 },
  { label: 'Rounds before unlock', key: 'rounds_before_unlock', min: 1, max: 10 },
  { label: 'New words per unlock', key: 'words_per_unlock',     min: 1, max: 10 },
]

interface Props {
  mode: 'onboarding' | 'edit'
  onDone: () => void
  onBack?: () => void
  highlightApiKey?: boolean
}

/* ── small presentational bits ─────────────────────────────────────── */

function OptionCard({ selected, icon, title, desc, onClick }: {
  selected: boolean
  icon: ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="relative flex w-full flex-col gap-2 rounded-xl p-4 pr-8 text-left transition-all hover-border"
      style={{
        backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
      }}
    >
      {selected && (
        <span
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <CheckIcon width={11} height={11} />
        </span>
      )}
      <span style={{ color: selected ? 'var(--accent-text)' : 'var(--text-secondary)' }}>{icon}</span>
      <span
        className="text-sm font-semibold"
        style={{ color: selected ? 'var(--accent-text)' : 'var(--text-primary)' }}
      >
        {title}
      </span>
      <span
        className="text-xs leading-snug"
        style={{ color: selected ? 'var(--accent-text)' : 'var(--text-tertiary)', opacity: selected ? 0.85 : 1 }}
      >
        {desc}
      </span>
    </button>
  )
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T | undefined
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      {options.map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className="rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={{
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── form ──────────────────────────────────────────────────────────── */

export function SettingsForm({ mode, onDone, onBack, highlightApiKey }: Props) {
  const isFirstRun = mode === 'onboarding'
  const supabase = createClient()

  const [settings, setSettings] = useState<Partial<Settings>>({
    starting_hsk: 1, strictness: 2, sentences_per_round: 10,
    rounds_before_unlock: 3, words_per_unlock: 5,
    show_pinyin: 'tap', show_hints: 'after',
    practice_mode: 'static',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [theme, setTheme] = useState<ThemeId>(loadSavedTheme)
  const [loaded, setLoaded] = useState(false)

  // API key is local-only — persisted to localStorage, never to Supabase.
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<'untested' | 'testing' | 'valid' | 'invalid'>('untested')
  const [keyHighlighted, setKeyHighlighted] = useState(false)
  const apiKeySectionRef = useRef<HTMLDivElement>(null)
  const apiKeyInputRef = useRef<HTMLInputElement>(null)

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
  useEffect(() => { const stored = getApiKey(); if (stored) setApiKey(stored) }, [])

  // Scroll/focus/highlight the API key input when arriving via a redirect
  // that needs it (e.g. practice page bounced the user here for a missing
  // key). Only makes sense once the real practice_mode has loaded and is
  // actually 'ai' — otherwise the input isn't even rendered yet.
  useEffect(() => {
    if (!loaded || !highlightApiKey || settings.practice_mode !== 'ai') return
    apiKeySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    apiKeyInputRef.current?.focus()
    setKeyHighlighted(true)
    const timer = setTimeout(() => setKeyHighlighted(false), 2500)
    return () => clearTimeout(timer)
  }, [loaded, highlightApiKey, settings.practice_mode])

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

  async function testApiKey() {
    if (!apiKey.trim()) return
    setKeyStatus('testing')
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      setKeyStatus(data?.valid ? 'valid' : 'invalid')
    } catch {
      setKeyStatus('invalid')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-text)' }}
            >
              ← Back
            </button>
          )}
          <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
            {isFirstRun
              ? <>Welcome to <span className="font-hanzi" style={{ color: 'var(--hanzi-color)' }}>音吉</span></>
              : 'Settings'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isFirstRun
              ? 'Tell us where you want to start — you can change this any time.'
              : 'Customize your learning experience'}
          </p>
        </div>

        <div className="hidden items-start gap-3 lg:flex" aria-hidden="true">
          <div
            className="text-right text-[11px] font-semibold uppercase leading-tight tracking-[0.22em]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <div>Small</div>
            <div>Steps</div>
            <div className="mt-1">Big</div>
            <div>Progress</div>
            <div className="ml-auto mt-2 h-0.5 w-8" style={{ backgroundColor: 'var(--accent)' }} />
          </div>
          <svg
            width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.5 }}
          >
            <path d="M5 21c8 0 14-6 14-14V5h-2C9 5 5 11 5 19v2Z" />
            <path d="M5 21c2.5-4 6-7 10.5-9" />
          </svg>
        </div>
      </div>

      {!loaded && (
        <div className="flex justify-center py-12">
          <div
            className="h-5 w-5 animate-spin rounded-full"
            style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {loaded && (
        <>
          <div className="space-y-4">
            {/* HSK level */}
            <SettingCard
              icon={<HskIcon />}
              title={isFirstRun ? 'Starting level' : 'HSK Level'}
              description="Select your current Chinese proficiency level"
            >
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map(level => {
                  const selected = settings.starting_hsk === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update('starting_hsk', level as Settings['starting_hsk'])}
                      aria-pressed={selected}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all hover-border"
                      style={{
                        backgroundColor: selected ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: selected ? '#fff' : 'var(--text-secondary)',
                        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      }}
                    >
                      HSK {level}
                      {selected && (
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full"
                          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                        >
                          <CheckIcon width={9} height={9} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {HSK_DESCRIPTIONS[settings.starting_hsk ?? 2]}
              </p>
            </SettingCard>

            {/* Grading strictness */}
            <SettingCard
              icon={<StrictnessIcon />}
              title="Grading Strictness"
              description="Choose how strictly your answers are evaluated"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {STRICTNESS_OPTIONS.map(o => (
                  <OptionCard
                    key={o.value}
                    selected={settings.strictness === o.value}
                    icon={o.icon}
                    title={o.label}
                    desc={o.desc}
                    onClick={() => update('strictness', o.value)}
                  />
                ))}
              </div>
            </SettingCard>

            {/* Practice mode */}
            <SettingCard
              icon={<PracticeModeIcon />}
              title="Practice Mode"
              description="Choose how you want to practice"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRACTICE_MODE_OPTIONS.map(o => (
                  <OptionCard
                    key={o.value}
                    selected={settings.practice_mode === o.value}
                    icon={o.icon}
                    title={o.label}
                    desc={o.desc}
                    onClick={() => update('practice_mode', o.value)}
                  />
                ))}
              </div>

              {settings.practice_mode === 'ai' && (
                <div
                  ref={apiKeySectionRef}
                  className="mt-3 space-y-2 rounded-xl transition-shadow"
                  style={keyHighlighted ? { boxShadow: '0 0 0 3px var(--accent-subtle), 0 0 0 1px var(--accent)' } : undefined}
                >
                  <div className="flex gap-2">
                    <input
                      ref={apiKeyInputRef}
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value)
                        saveApiKey(e.target.value)
                        setKeyStatus('untested')
                      }}
                      placeholder="sk-ant-..."
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                      style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={testApiKey}
                      disabled={!apiKey.trim() || keyStatus === 'testing'}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover-border disabled:opacity-50"
                      style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      {keyStatus === 'testing' ? 'Testing…' : 'Test key'}
                    </button>
                  </div>
                  {keyStatus !== 'untested' && (
                    <p
                      className="text-xs"
                      style={{
                        color: keyStatus === 'valid'
                          ? 'var(--accent-text)'
                          : keyStatus === 'invalid'
                            ? 'var(--error-text)'
                            : 'var(--text-tertiary)',
                      }}
                    >
                      {keyStatus === 'testing' && 'Checking key…'}
                      {keyStatus === 'valid' && 'Key is valid'}
                      {keyStatus === 'invalid' && 'Key is invalid'}
                    </p>
                  )}
                </div>
              )}
            </SettingCard>

            {/* Session */}
            <SettingCard
              icon={<SessionIcon />}
              title="Session"
              description="Adjust your study session preferences"
              layout="split"
            >
              <div
                className="overflow-hidden rounded-xl"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                {SESSION_ROWS.map(({ label, key, min, max }, i) => {
                  const value = (settings[key] as number) ?? min
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-4 py-3"
                      style={i < SESSION_ROWS.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease ${label}`}
                          onClick={() => update(key, Math.max(min, value - 1) as never)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover-bg"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {value}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${label}`}
                          onClick={() => update(key, Math.min(max, value + 1) as never)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover-bg"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SettingCard>

            {/* Display */}
            <SettingCard
              icon={<DisplayIcon />}
              title="Display"
              description="Control what you see during practice"
              layout="split"
            >
              <div
                className="overflow-hidden rounded-xl"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show pinyin</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Display pinyin with Chinese characters</p>
                  </div>
                  <Segmented
                    value={settings.show_pinyin}
                    options={['always', 'tap', 'never'] as const}
                    onChange={v => update('show_pinyin', v)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show vocab hints</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Show hints before or after answering</p>
                  </div>
                  <Segmented
                    value={settings.show_hints}
                    options={['before', 'after', 'never'] as const}
                    onChange={v => update('show_hints', v)}
                  />
                </div>
              </div>
            </SettingCard>

            {/* Theme */}
            <SettingCard
              icon={<ThemeIcon />}
              title="Theme"
              description="Choose a theme for the app"
              layout="split"
            >
              <ThemePicker selected={theme} onChange={setTheme} showLabel={false} />
            </SettingCard>
          </div>

          {/* Save */}
          <div className="mt-6">
            {saveError && (
              <p
                className="mb-3 rounded-lg px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}
              >
                {saveError}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundImage: 'linear-gradient(90deg, var(--gradient-cta-from), var(--gradient-cta-to))',
                color: '#fff',
              }}
            >
              {saving ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full"
                    style={{ border: '2px solid #fff', borderTopColor: 'transparent' }}
                  />
                  Saving…
                </>
              ) : isFirstRun ? (
                'Start practicing →'
              ) : (
                <>
                  <SaveIcon width={16} height={16} />
                  Save Settings
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {isFirstRun
                ? 'You can change any of this later in Settings.'
                : 'Theme changes apply right away; other preferences save when you press the button.'}
            </p>
          </div>
        </>
      )}
    </>
  )
}
