'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Progress, Settings } from '@/types'

export function useProgress() {
  const supabase = createClient()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [vocabCount, setVocabCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prog }, { data: sett }, { count }] = await Promise.all([
      supabase.from('progress').select('*').eq('user_id', user.id).single(),
      supabase.from('settings').select('*').eq('user_id', user.id).single(),
      supabase.from('vocab_list').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    if (prog) {
      setProgress(prog)
    } else {
      // No progress row yet — create a default one
      const { data: created } = await supabase.from('progress').upsert({
        user_id: user.id,
        rounds_completed: 0,
        sentences_completed: 0,
        current_round_sentences: 0,
        current_round_number: 1,
        accuracy_history: [],
        rolling_accuracy: 0,
      }).select().single()
      if (created) setProgress(created)
    }

    if (sett) setSettings(sett)
    setVocabCount(count ?? 0)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function incrementSentence(correct: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !progress) return

    const sentencesPerRound = settings?.sentences_per_round ?? 10
    const newSentences = progress.current_round_sentences + 1
    const roundComplete = newSentences >= sentencesPerRound
    const newRound = roundComplete ? progress.current_round_number + 1 : progress.current_round_number
    const newRoundSentences = roundComplete ? 0 : newSentences
    const newRoundsCompleted = roundComplete ? progress.rounds_completed + 1 : progress.rounds_completed
    const newSentencesCompleted = progress.sentences_completed + 1

    // Rolling accuracy (last 30 sentences approximation)
    const currentTotal = progress.sentences_completed
    const currentCorrect = Math.round((progress.rolling_accuracy / 100) * Math.min(currentTotal, 30))
    const windowSize = Math.min(currentTotal + 1, 30)
    const newCorrect = currentCorrect + (correct ? 1 : 0) - (currentTotal >= 30 ? Math.round(progress.rolling_accuracy / 100) : 0)
    const newAccuracy = Math.round((Math.max(0, newCorrect) / windowSize) * 100)

    const updated = {
      current_round_sentences: newRoundSentences,
      current_round_number: newRound,
      rounds_completed: newRoundsCompleted,
      sentences_completed: newSentencesCompleted,
      rolling_accuracy: newAccuracy,
    }

    await supabase.from('progress').update(updated).eq('user_id', user.id)
    setProgress(prev => prev ? { ...prev, ...updated } : prev)

    return { roundComplete, roundsCompleted: newRoundsCompleted }
  }

  async function resetRoundCounter() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('progress').update({ current_round_number: 1, current_round_sentences: 0 }).eq('user_id', user.id)
    setProgress(prev => prev ? { ...prev, current_round_number: 1, current_round_sentences: 0 } : prev)
  }

  return { progress, settings, vocabCount, loading, reload: load, incrementSentence, resetRoundCounter }
}
