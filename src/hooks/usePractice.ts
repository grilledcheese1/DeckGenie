'use client'

import { useState, useCallback, useRef } from 'react'
import type { GenerateResponse, GradeResponse, SentenceState, PinyinMode, Settings } from '@/types'
import { getApiKey } from '@/lib/byoKey'

// Dev-only shortcut: typing this as the answer jumps straight to a graded
// state without calling /api/grade, so the post-grade UI (Next sentence,
// Analyze sentence) can be reviewed without spending any API credits.
const DEV_SKIP_CODE = '8302113'

export function usePractice(strictness: number = 2, practiceMode: Settings['practice_mode'] = 'static') {
  const [state, setState] = useState<SentenceState>({
    sentence: null,
    pinyinMode: 'hidden',
    userAnswer: '',
    grade: null,
    status: 'loading',
    error: null,
  })
  const recentRef = useRef<Array<{ zh: string; py: string }>>([])

  const fetchSentence = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', grade: null, userAnswer: '', pinyinMode: 'hidden', error: null }))
    let apiKey: string | null = null
    if (practiceMode === 'ai') {
      apiKey = getApiKey()
      if (!apiKey) {
        setState(prev => ({ ...prev, status: 'error', error: 'Add your Anthropic API key in Settings.' }))
        return
      }
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['X-Anthropic-Key'] = apiKey
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ recent: recentRef.current }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (body?.error === 'not_enough_static_content') {
          setState(prev => ({ ...prev, status: 'no_content', error: null }))
          return
        }
        throw new Error(body?.error || 'Failed to generate a sentence.')
      }
      const data: GenerateResponse = await res.json()
      recentRef.current = [
        { zh: data.sentence_zh, py: data.sentence_py },
        ...recentRef.current,
      ].slice(0, 5)
      setState(prev => ({ ...prev, sentence: data, status: 'ready' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate a sentence.'
      setState(prev => ({ ...prev, status: 'error', error: message }))
    }
  }, [practiceMode])

  const submitAnswer = useCallback(async () => {
    if (!state.sentence || !state.userAnswer.trim()) return

    if (process.env.NODE_ENV !== 'production' && state.userAnswer.trim() === DEV_SKIP_CODE) {
      setState(prev => ({
        ...prev,
        status: 'graded',
        grade: {
          correct: true,
          score: 100,
          feedback: 'Dev shortcut — no grading call was made.',
          correct_answer: '(dev preview — no real translation graded)',
        },
      }))
      return
    }

    let apiKey: string | null = null
    if (practiceMode === 'ai') {
      apiKey = getApiKey()
      if (!apiKey) {
        setState(prev => ({ ...prev, status: 'error', error: 'Add your Anthropic API key in Settings.' }))
        return
      }
    }
    setState(prev => ({ ...prev, status: 'submitted' }))
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['X-Anthropic-Key'] = apiKey
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sentence_id: state.sentence.sentence_id,
          user_answer: state.userAnswer,
          strictness,
        }),
      })
      if (!res.ok) throw new Error('Grade request failed')
      const grade: GradeResponse = await res.json()
      setState(prev => ({ ...prev, grade, status: 'graded' }))
    } catch {
      setState(prev => ({ ...prev, status: 'ready' }))
    }
  }, [state.sentence, state.userAnswer, strictness, practiceMode])

  const togglePinyin = useCallback(() => {
    setState(prev => ({ ...prev, pinyinMode: prev.pinyinMode === 'hidden' ? 'showing' : 'hidden' }))
  }, [])

  const setAnswer = useCallback((answer: string) => {
    setState(prev => ({ ...prev, userAnswer: answer }))
  }, [])

  const restoreSentence = useCallback((draft: {
    sentence: GenerateResponse
    userAnswer: string
    grade: GradeResponse | null
    status: 'ready' | 'graded'
    pinyinMode: PinyinMode
  }) => {
    recentRef.current = [
      { zh: draft.sentence.sentence_zh, py: draft.sentence.sentence_py },
      ...recentRef.current,
    ].slice(0, 5)
    setState({ ...draft, error: null })
  }, [])

  return { state, fetchSentence, submitAnswer, togglePinyin, setAnswer, restoreSentence }
}
