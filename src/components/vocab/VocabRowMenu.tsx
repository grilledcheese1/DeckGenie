'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'

interface Props {
  word: VocabWord
  onDelete: () => void
  onClose: () => void
}

const GAP = 6
const EDGE = 8

/**
 * The "•••" row menu -- mirrors CharTooltip.tsx's anchor/flip/GSAP
 * convention (practice's analysis-mode character tooltip): a small
 * popover, positioned relative to its `position: relative` parent cell,
 * flipping above the anchor when there isn't room below. Two internal
 * steps: "menu" (Delete word) -> "confirm" (Delete X? Cancel/Delete).
 */
export function VocabRowMenu({ word, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom')
  const [step, setStep] = useState<'menu' | 'confirm'>('menu')

  useLayoutEffect(() => {
    const el = ref.current
    const anchor = el?.parentElement
    if (!el || !anchor) return
    const rect = anchor.getBoundingClientRect()
    const spaceAbove = rect.top - GAP - EDGE
    const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE
    setPlacement(spaceBelow >= el.offsetHeight || spaceBelow > spaceAbove ? 'bottom' : 'top')
  }, [step])

  useLayoutEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' }
    )
  }, [placement, step])

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); onClose() }} />
      <div
        ref={ref}
        className="absolute z-40 text-left"
        style={{
          ...(placement === 'top' ? { bottom: `calc(100% + ${GAP}px)` } : { top: `calc(100% + ${GAP}px)` }),
          right: 0,
          width: step === 'confirm' ? '200px' : '140px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="rounded-xl p-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-hover)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {step === 'menu' ? (
            <button
              onClick={() => setStep('confirm')}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover-bg"
              style={{ color: '#ef4444' }}
            >
              Delete word
            </button>
          ) : (
            <div className="px-1 py-1">
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                Delete <span className="font-hanzi" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>?
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={onClose}
                  className="flex-1 text-xs font-medium rounded-lg py-1.5 transition-colors hover-bg"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 text-xs font-medium rounded-lg py-1.5 transition-colors"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
