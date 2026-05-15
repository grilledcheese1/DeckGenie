'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'

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

function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstRun = searchParams.get('firstRun') === 'true'
  const supabase = createClient()

  const [settings, setSettings] = useState<Partial<Settings>>({
    starting_hsk: 2, strictness: 2, sentences_per_round: 10,
    rounds_before_unlock: 3, words_per_unlock: 5,
    show_pinyin: 'tap', show_hints: 'after',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
    if (data) setSettings(data)
  }, [supabase])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('settings').upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' })
    if (isFirstRun) {
      await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsk_level: settings.starting_hsk, exclude_zh: [], count: 20 }),
      })
      router.push('/dashboard')
    } else {
      setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen px-4 py-10 max-w-lg mx-auto">
      <div className="mb-10">
        {!isFirstRun && (
          <button onClick={() => router.back()} className="text-stone-500 hover:text-stone-300 text-sm mb-6 flex items-center gap-1.5 transition-colors">
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-medium">
          {isFirstRun ? <span>Welcome to <span className="font-hanzi text-emerald-400">汉字练习</span></span> : 'Settings'}
        </h1>
        {isFirstRun && <p className="text-stone-400 text-sm mt-1">Tell us where you want to start — you can change this any time.</p>}
      </div>
      <div className="space-y-8">
        <section>
          <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-4">{isFirstRun ? 'Starting level' : 'HSK level'}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[1,2,3,4,5,6].map(level => (
              <button key={level} onClick={() => update('starting_hsk', level as Settings['starting_hsk'])}
                className={`rounded-xl py-3 text-center text-sm font-medium border transition-all ${settings.starting_hsk === level ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300' : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'}`}>
                HSK {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">{HSK_DESCRIPTIONS[settings.starting_hsk ?? 2]}</p>
        </section>
        <section>
          <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-4">Grading strictness</h2>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(level => {
              const s = STRICTNESS_LABELS[level]
              return (
                <button key={level} onClick={() => update('strictness', level as Settings['strictness'])}
                  className={`rounded-xl p-3 text-left border transition-all ${settings.strictness === level ? 'bg-emerald-900/60 border-emerald-600' : 'bg-stone-900 border-stone-800 hover:border-stone-600'}`}>
                  <p className={`text-sm font-medium ${settings.strictness === level ? 'text-emerald-300' : 'text-stone-300'}`}>{s.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-tight">{s.desc}</p>
                </button>
              )
            })}
          </div>
        </section>
        <section>
          <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-4">Session</h2>
          <div className="space-y-1 bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
            {[
              { label: 'Sentences per round', key: 'sentences_per_round' as const, min: 5, max: 20 },
              { label: 'Rounds before unlock', key: 'rounds_before_unlock' as const, min: 1, max: 10 },
              { label: 'New words per unlock', key: 'words_per_unlock' as const, min: 1, max: 10 },
            ].map(({ label, key, min, max }, i, arr) => (
              <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-stone-800' : ''}`}>
                <span className="text-sm text-stone-300">{label}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(key, Math.max(min, (settings[key] as number) - 1) as never)}
                    className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm flex items-center justify-center transition-colors">−</button>
                  <span className="w-6 text-center text-sm font-medium text-stone-100">{settings[key] as number}</span>
                  <button onClick={() => update(key, Math.min(max, (settings[key] as number) + 1) as never)}
                    className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm flex items-center justify-center transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xs uppercase tracking-widest text-stone-500 mb-4">Display</h2>
          <div className="space-y-1 bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-800">
              <span className="text-sm text-stone-300">Show pinyin</span>
              <div className="flex gap-1">
                {(['always','tap','never'] as const).map(v => (
                  <button key={v} onClick={() => update('show_pinyin', v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${settings.show_pinyin === v ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700' : 'bg-stone-800 text-stone-400 border border-transparent hover:border-stone-700'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-stone-300">Show vocab hints</span>
              <div className="flex gap-1">
                {(['before','after','never'] as const).map(v => (
                  <button key={v} onClick={() => update('show_hints', v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${settings.show_hints === v ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700' : 'bg-stone-800 text-stone-400 border border-transparent hover:border-stone-700'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-10">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl py-3.5 text-sm transition-colors">
          {saving ? 'Saving…' : saved ? '✓ Saved' : isFirstRun ? 'Start practicing →' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SettingsInner />
    </Suspense>
  )
}
