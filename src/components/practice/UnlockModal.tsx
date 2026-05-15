'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { CorpusWord } from '@/types'
import { CORPUS_TOPICS } from '@/data/hsk-corpus'

interface Props {
  wordsPerUnlock: number
  currentHsk: number
  activeVocab: string[]
  onComplete: (words: CorpusWord[]) => void
}

const POS_OPTIONS = ['any', 'noun', 'verb', 'adjective', 'adverb']

export function UnlockModal({ wordsPerUnlock, currentHsk, activeVocab, onComplete }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const panelRef    = useRef<HTMLDivElement>(null)
  const wordsRef    = useRef<HTMLDivElement>(null)

  const [pos, setPos]     = useState('any')
  const [topic, setTopic] = useState('any')
  const [hsk, setHsk]     = useState(currentHsk)
  const [words, setWords] = useState<CorpusWord[]>([])
  const [step, setStep]   = useState<'filters' | 'loading' | 'reveal'>('filters')

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25 }
      )
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 40, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [])

  // Word-by-word reveal animation
  useEffect(() => {
    if (step !== 'reveal' || !wordsRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.unlock-word',
        { opacity: 0, y: 16, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(1.6)', delay: 0.1 }
      )
    }, wordsRef)
    return () => ctx.revert()
  }, [step])

  async function handleGenerate() {
    setStep('loading')
    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pos: pos === 'any' ? undefined : pos,
        topic: topic === 'any' ? undefined : topic,
        hsk_level: hsk,
        exclude_zh: activeVocab,
        count: wordsPerUnlock,
      }),
    })
    const data = await res.json()
    setWords(data.words ?? [])
    setStep('reveal')
  }

  const topics = ['any', ...CORPUS_TOPICS]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-3xl p-6"
      >
        {/* Filters step */}
        {step === 'filters' && (
          <>
            <div className="mb-6">
              <p className="text-lg font-medium text-stone-100">
                +{wordsPerUnlock} new words
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Filter by type or topic, or let us pick
              </p>
            </div>

            {/* Part of speech */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-stone-600 mb-2">Part of speech</p>
              <div className="flex flex-wrap gap-2">
                {POS_OPTIONS.map(p => (
                  <button key={p} onClick={() => setPos(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-all ${
                      pos === p
                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-stone-600 mb-2">Topic</p>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {topics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-all ${
                      topic === t
                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* HSK level */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-stone-600 mb-2">Up to HSK level</p>
              <div className="flex gap-2">
                {[1,2,3,4,5,6].map(l => (
                  <button key={l} onClick={() => setHsk(l)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      hsk === l
                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-600'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate}
              className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white font-medium rounded-2xl py-3.5 text-sm transition-all">
              Generate my words →
            </button>
          </>
        )}

        {/* Loading step */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm text-stone-500">Finding your words…</p>
          </div>
        )}

        {/* Reveal step */}
        {step === 'reveal' && (
          <>
            <p className="text-lg font-medium text-stone-100 mb-1">Your new words</p>
            <p className="text-xs text-stone-500 mb-6">Added to your active vocab</p>

            <div ref={wordsRef} className="space-y-2 mb-6">
              {words.map(word => (
                <div key={word.zh} className="unlock-word flex items-center justify-between bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-hanzi text-xl text-stone-100">{word.zh}</span>
                    <div>
                      <p className="text-xs text-stone-400">{word.py}</p>
                      <p className="text-xs text-stone-600">{word.en}</p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-700 bg-stone-800 rounded-lg px-2 py-0.5 capitalize">
                    {word.pos}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onComplete(words)}
              className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white font-medium rounded-2xl py-3.5 text-sm transition-all"
            >
              Keep practicing →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
