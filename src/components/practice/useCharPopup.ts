'use client'

import { useState, useCallback } from 'react'
import type { VocabWord } from '@/types'

/**
 * Shared state + vocab lookup behind the tap-a-character popup
 * (`CharTooltip` → "More →" → `CharDetailSheet`). Used by both
 * `AnalysisSentence` (the analysed sentence) and `SentenceBreakdownCard`
 * (the right-rail structure chips) so the two behave identically instead
 * of each carrying its own copy of the active/showSheet state machine.
 *
 * Callers key each tap target by a string of their choosing (segment
 * index, `role-index`, …) — only one target is ever open at a time, and
 * re-tapping the open one closes it.
 */
export interface CharInfo {
  pinyin: string
  english: string
  hsk: 1 | 2 | 3 | 4 | 5 | 6
  pos: string
}

const FALLBACK: CharInfo = { pinyin: '', english: '—', hsk: 1, pos: 'other' }

interface Active {
  key: string
  segment: string
}

export function useCharPopup(vocabList: VocabWord[]) {
  const [active, setActive]       = useState<Active | null>(null)
  const [showSheet, setShowSheet] = useState(false)

  const getVocab = useCallback(
    (segment: string): VocabWord | null =>
      vocabList.find(w => w.word_zh === segment) ?? null,
    [vocabList],
  )

  const getInfo = useCallback(
    (segment: string): CharInfo => {
      const v = getVocab(segment)
      return v
        ? { pinyin: v.pinyin, english: v.english, hsk: v.hsk_level, pos: v.pos }
        : FALLBACK
    },
    [getVocab],
  )

  const toggle = useCallback((key: string, segment: string) => {
    setShowSheet(false)
    setActive(prev => (prev?.key === key ? null : { key, segment }))
  }, [])

  const close = useCallback(() => {
    setActive(null)
    setShowSheet(false)
  }, [])

  const openSheet = useCallback(() => setShowSheet(true), [])

  return {
    activeKey: active?.key ?? null,
    activeSegment: active?.segment ?? null,
    showSheet,
    getVocab,
    getInfo,
    toggle,
    close,
    openSheet,
  }
}
