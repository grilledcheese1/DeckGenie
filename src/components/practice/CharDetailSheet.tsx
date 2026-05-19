'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'
import { getToneFromPinyin, RADICAL_MAP } from '@/lib/chinese'

interface Props {
  segment: string
  pinyin: string
  english: string
  hsk: number
  pos: string
  vocabWord: VocabWord | null
  onClose: () => void
}

export function CharDetailSheet({
  segment, pinyin, english, hsk, pos,
  vocabWord, onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25 }
      )
      gsap.fromTo(sheetRef.current,
        { y: '100%' },
        { y: '0%', duration: 0.4, ease: 'power3.out' }
      )
    })
    return () => ctx.revert()
  }, [])

  function handleClose() {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(sheetRef.current,   { y: '100%', duration: 0.32, ease: 'power3.in' })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.15')
  }

  const tone    = getToneFromPinyin(pinyin)
  const radical = RADICAL_MAP[segment] ?? null
  const accuracy = vocabWord && vocabWord.times_seen > 0
    ? Math.round((vocabWord.times_correct / vocabWord.times_seen) * 100)
    : null

  const tones = [1, 2, 3, 4] as const

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div
        ref={sheetRef}
        className="w-full rounded-t-3xl"
        style={{
          background: 'var(--bg-primary)',
          border: '0.5px solid var(--border)',
          borderBottom: 'none',
          height: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-hover)' }} />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <span
                className="font-hanzi"
                style={{ fontSize: '44px', color: 'var(--text-primary)', lineHeight: 1 }}
              >
                {segment}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
                  {pinyin} · tone {tone === 0 ? 'neutral' : tone}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {english}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <span
                className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
              >
                HSK {hsk}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-lg capitalize"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  border: '0.5px solid var(--border)',
                }}
              >
                {pos}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                label: 'Times seen',
                value: vocabWord?.times_seen ?? 0,
                color: 'var(--text-primary)',
                isHanzi: false,
              },
              {
                label: 'Accuracy',
                value: accuracy !== null ? `${accuracy}%` : '—',
                color: accuracy !== null && accuracy >= 70
                  ? 'var(--accent-text)'
                  : accuracy !== null && accuracy >= 40
                  ? '#fbbf24'
                  : 'var(--text-primary)',
                isHanzi: false,
              },
              {
                label: 'Radical',
                value: radical?.radical ?? '—',
                color: 'var(--text-primary)',
                isHanzi: true,
              },
            ].map(({ label, value, color, isHanzi }) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
              >
                <p
                  className={`font-medium mb-0.5 ${isHanzi ? 'font-hanzi text-2xl' : 'text-xl'}`}
                  style={{ color }}
                >
                  {value}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {radical && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                Radical · {radical.radical} ({radical.pinyin})
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {radical.meaning}
              </p>
            </div>
          )}

          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
          >
            <p className="text-xs mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
              Tone
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {tones.map(t => {
                const isActive = tone === t
                return (
                  <div
                    key={t}
                    className="rounded-lg py-2 text-center"
                    style={{
                      background: isActive ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                      border: isActive
                        ? '0.5px solid var(--accent)'
                        : '0.5px solid var(--border)',
                    }}
                  >
                    <p
                      className="text-xs font-medium"
                      style={{ color: isActive ? 'var(--accent-text)' : 'var(--text-tertiary)' }}
                    >
                      {t === 1 ? 'ā' : t === 2 ? 'á' : t === 3 ? 'ǎ' : 'à'}
                    </p>
                    <p
                      style={{
                        color: isActive ? 'var(--accent-text)' : 'var(--text-tertiary)',
                        opacity: isActive ? 1 : 0.5,
                        fontSize: '10px',
                      }}
                    >
                      {t}st
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-5 rounded-2xl py-3.5 text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
