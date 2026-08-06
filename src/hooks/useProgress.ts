'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Progress, Settings } from '@/types'

const PROGRESS_KEY = 'hanzi_progress'
const SETTINGS_KEY = 'hanzi_settings'
const UNLOCK_CLAIMED_KEY = 'hanzi_unlock_claimed'

function readLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
}

const DEFAULT_PROGRESS: Omit<Progress, 'id' | 'user_id' | 'updated_at'> = {
  rounds_completed: 0,
  sentences_completed: 0,
  current_round_sentences: 0,
  current_round_number: 1,
  rolling_accuracy: 0,
  streak_days: 0,
  longest_streak_days: 0,
  last_practiced_at: null,
  last_claimed_round: 0,
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
  const [lastClaimedRound, setLastClaimedRound] = useState<number>(() =>
    readLocal<number>(UNLOCK_CLAIMED_KEY) ?? 0
  )

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
          setLastClaimedRound(prog.last_claimed_round)
          writeLocal(UNLOCK_CLAIMED_KEY, prog.last_claimed_round)
        } else {
          // Try to create a DB row; fall back to localStorage / defaults regardless
          const { error: upsertError } = await supabase.from('progress').upsert(
            { user_id: user.id, ...DEFAULT_PROGRESS },
            { onConflict: 'user_id' }
          )
          if (upsertError) console.error('progress upsert failed:', upsertError.message)
          const cached = readLocal<Progress>(PROGRESS_KEY)
          setProgress({ ...DEFAULT_PROGRESS, ...(cached ?? {}) } as unknown as Progress)
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
    setProgress({ ...DEFAULT_PROGRESS, ...(cachedProg ?? {}) } as unknown as Progress)
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

  async function finishRound(summary: {
    sentences_total: number
    sentences_correct: number
    accuracy_pct: number
    top_streak: number
    strictness: number
    round_number: number
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('complete_round', {
          p_round_number:      summary.round_number,
          p_sentences_total:   summary.sentences_total,
          p_sentences_correct: summary.sentences_correct,
          p_accuracy_pct:      summary.accuracy_pct,
          p_top_streak:        summary.top_streak,
          p_strictness:        summary.strictness,
        })
      }
    } catch {}
  }

  async function claimUnlock() {
    const r = progress?.rounds_completed ?? 0
    setLastClaimedRound(r)
    writeLocal(UNLOCK_CLAIMED_KEY, r)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('claim_unlock')
        const { data } = await supabase.from('progress')
          .select('last_claimed_round')
          .eq('user_id', user.id)
          .single()
        if (data != null) {
          setLastClaimedRound(data.last_claimed_round)
          writeLocal(UNLOCK_CLAIMED_KEY, data.last_claimed_round)
        }
      }
    } catch {}
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

  const roundsCompleted    = progress?.rounds_completed ?? 0
  const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
  const canUnlock = roundsCompleted > 0
    && roundsCompleted % roundsBeforeUnlock === 0
    && roundsCompleted > lastClaimedRound

  return { progress, settings, vocabCount, loading, reload: load, incrementSentence, finishRound, resetRoundCounter, claimUnlock, canUnlock }
}
