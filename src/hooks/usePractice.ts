'use client'

import { useState, useCallback, useRef } from 'react'
import type { GenerateResponse, GradeResponse, SentenceState } from '@/types'

export function usePractice(strictness: number = 2) {
  const [state, setState] = useState<SentenceState>({
    sentence: null,
    pinyinMode: 'hidden',
    userAnswer: '',
    grade: null,
    status: 'loading',
  })
  const recentRef = useRef<Array<{ zh: string; py: string }>>([])

  const fetchSentence = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', grade: null, userAnswer: '', pinyinMode: 'hidden' }))
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recent: recentRef.current }),
      })
      if (!res.ok) throw new Error('Failed to generate')
      const data: GenerateResponse = await res.json()
      recentRef.current = [
        { zh: data.sentence_zh, py: data.sentence_py },
        ...recentRef.current,
      ].slice(0, 5)
      setState(prev => ({ ...prev, sentence: data, status: 'ready' }))
    } catch {
      setState(prev => ({ ...prev, status: 'ready' }))
    }
  }, [])

  const submitAnswer = useCallback(async () => {
    if (!state.sentence || !state.userAnswer.trim()) return
    setState(prev => ({ ...prev, status: 'submitted' }))
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_answer: state.userAnswer,
          sentence_zh: state.sentence.sentence_zh,
          sentence_py: state.sentence.sentence_py,
          strictness,
          vocab_used: state.sentence.vocab_used,
        }),
      })
      const grade: GradeResponse = await res.json()
      setState(prev => ({ ...prev, grade, status: 'graded' }))
    } catch {
      setState(prev => ({ ...prev, status: 'ready' }))
    }
  }, [state.sentence, state.userAnswer, strictness])

  const togglePinyin = useCallback(() => {
    setState(prev => ({ ...prev, pinyinMode: prev.pinyinMode === 'hidden' ? 'showing' : 'hidden' }))
  }, [])

  const setAnswer = useCallback((answer: string) => {
    setState(prev => ({ ...prev, userAnswer: answer }))
  }, [])

  return { state, fetchSentence, submitAnswer, togglePinyin, setAnswer }
}
