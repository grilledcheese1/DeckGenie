'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Progress, Settings } from '@/types'

const PROGRESS_KEY = 'hanzi_progress'
const SETTINGS_KEY = 'hanzi_settings'

function readLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
}

const DEFAULT_PROGRESS: Omit<Progress, 'id' | 'user_id' | 'updated_at' | 'accuracy_history'> = {
  rounds_completed: 0,
  sentences_completed: 0,
  current_round_sentences: 0,
  current_round_number: 1,
  rolling_accuracy: 0,
}

const DEFAULT_SETTINGS: Partial<Settings> = {
  starting_hsk: 2, strictness: 2, sentences_per_round: 10,
  rounds_before_unlock: 3, words_per_unlock: 5,
  show_pinyin: 'tap', show_hints: 'after',
}

export function useProgress() {
  const supabase = createClient()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [vocabCount, setVocabCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [{ data: prog }, { data: sett }, { count }] = await Promise.all([
          supabase.from('progress').select('*').eq('user_id', user.id).single(),
          supabase.from('settings').select('*').eq('user_id', user.id).single(),
          supabase.from('vocab_list').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        if (prog) {
          setProgress(prog)
          writeLocal(PROGRESS_KEY, prog)
        } else {
          // Try to create a DB row; fall back to localStorage / defaults regardless
          supabase.from('progress').upsert({ user_id: user.id, ...DEFAULT_PROGRESS, accuracy_history: [] }, { onConflict: 'user_id' }).then(() => {})
          const cached = readLocal<Progress>(PROGRESS_KEY)
          setProgress(cached ?? { ...DEFAULT_PROGRESS, accuracy_history: [] } as unknown as Progress)
        }

        if (sett) {
          setSettings(sett)
          writeLocal(SETTINGS_KEY, sett)
        } else {
          const cached = readLocal<Settings>(SETTINGS_KEY)
          setSettings(cached ?? DEFAULT_SETTINGS as Settings)
        }

        setVocabCount(count ?? 0)
        setLoading(false)
        return
      }
    } catch {}

    // No auth or network failure — use localStorage entirely
    const cachedProg = readLocal<Progress>(PROGRESS_KEY)
    setProgress(cachedProg ?? { ...DEFAULT_PROGRESS, accuracy_history: [] } as unknown as Progress)
    const cachedSett = readLocal<Settings>(SETTINGS_KEY)
    setSettings(cachedSett ?? DEFAULT_SETTINGS as Settings)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function incrementSentence(score: number) {
    if (!progress) return

    const sentencesPerRound = settings?.sentences_per_round ?? 10
    const newSentences = progress.current_round_sentences + 1
    const roundComplete = newSentences >= sentencesPerRound
    const newRoundsCompleted = roundComplete ? progress.rounds_completed + 1 : progress.rounds_completed
    const newSentencesCompleted = progress.sentences_completed + 1

    const newAccuracy = Math.round(
      (progress.rolling_accuracy * progress.sentences_completed + score) / newSentencesCompleted
    )

    const updated: Partial<Progress> = {
      current_round_sentences: roundComplete ? 0 : newSentences,
      current_round_number: roundComplete ? progress.current_round_number + 1 : progress.current_round_number,
      rounds_completed: newRoundsCompleted,
      sentences_completed: newSentencesCompleted,
      rolling_accuracy: newAccuracy,
    }

    const next = { ...progress, ...updated }
    setProgress(next)
    writeLocal(PROGRESS_KEY, next)

    // Best-effort DB sync
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('progress').update(updated).eq('user_id', user.id)
    } catch {}

    return { roundComplete, roundsCompleted: newRoundsCompleted }
  }

  async function resetRoundCounter() {
    const patch: Partial<Progress> = { current_round_number: 1, current_round_sentences: 0 }
    setProgress(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      writeLocal(PROGRESS_KEY, next)
      return next
    })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('progress').update(patch).eq('user_id', user.id)
    } catch {}
  }

  return { progress, settings, vocabCount, loading, reload: load, incrementSentence, resetRoundCounter }
}
