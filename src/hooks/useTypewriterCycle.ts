'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { SignMode } from '@/components/ui/NeonSign'

export type SignPhase =
  | 'warmup'
  | 'typing-en'
  | 'hold-en'
  | 'erasing-en'
  | 'typing-zh'
  | 'hold-zh'

export const CHAR_TYPE_SPEED  = 80
export const CHAR_ERASE_SPEED = 55
export const HOLD_DURATION    = 1800
export const RESTART_DELAY    = 3500

interface UseTypewriterCycleOptions {
  english: string
  chinese: string
  delay?: number
  mode: SignMode
  /**
   * Resolved glow color (the `glowColor` prop, falling back to the base
   * sign `color`) used for the GSAP box-shadow pulse below.
   */
  effectiveGlowColor: string
}

interface UseTypewriterCycleResult {
  /** Attach to the sign's bordered container element — driven by the GSAP glow-transition effect below. */
  borderRef: React.RefObject<HTMLDivElement | null>
  displayText: string
  isEnglish: boolean
  phase: SignPhase
  glowOn: boolean
}

/**
 * Shared typewriter state machine + GSAP glow-transition logic for
 * `NeonSign`/`NeonSignH`. Both components ran a byte-for-byte identical
 * warmup -> typing-en -> hold-en -> erasing-en -> typing-zh -> hold-zh ->
 * loop cycle (via chained `setTimeout`s) plus an identical GSAP
 * box-shadow pulse on hold phases; they differ only in how they render
 * the resulting state (vertical stacked characters vs horizontal
 * flex-row characters), which stays in each component.
 */
export function useTypewriterCycle({
  english, chinese, delay = 0, mode, effectiveGlowColor,
}: UseTypewriterCycleOptions): UseTypewriterCycleResult {
  const borderRef                     = useRef<HTMLDivElement>(null)
  const [displayText, setDisplayText] = useState('')
  const [isEnglish, setIsEnglish]     = useState(true)
  const [phase, setPhase]             = useState<SignPhase>('warmup')
  const [glowOn, setGlowOn]           = useState(false)
  const timeoutsRef                   = useRef<ReturnType<typeof setTimeout>[]>([])
  const runCycleRef                   = useRef<(() => void) | undefined>(undefined)

  function clearAll() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function after(ms: number, fn: () => void) {
    const t = setTimeout(fn, ms)
    timeoutsRef.current.push(t)
  }

  const runCycle = useCallback(() => {
    clearAll()

    setIsEnglish(true)
    setPhase('typing-en')
    setDisplayText('')

    let i = 0
    function typeEn() {
      if (i <= english.length) {
        setDisplayText(english.slice(0, i))
        i++
        after(CHAR_TYPE_SPEED, typeEn)
      } else {
        setPhase('hold-en')
        after(HOLD_DURATION, () => {
          setPhase('erasing-en')
          let j = english.length
          function eraseEn() {
            if (j >= 0) {
              setDisplayText(english.slice(0, j))
              j--
              after(CHAR_ERASE_SPEED, eraseEn)
            } else {
              setIsEnglish(false)
              setPhase('typing-zh')
              setDisplayText('')
              let k = 0
              function typeZh() {
                if (k <= chinese.length) {
                  setDisplayText(chinese.slice(0, k))
                  k++
                  after(CHAR_TYPE_SPEED * 1.3, typeZh)
                } else {
                  setPhase('hold-zh')
                  after(HOLD_DURATION * 1.5, () => {
                    after(RESTART_DELAY, () => runCycleRef.current?.())
                  })
                }
              }
              typeZh()
            }
          }
          eraseEn()
        })
      }
    }
    typeEn()
  }, [english, chinese])

  runCycleRef.current = runCycle

  useEffect(() => {
    const warmup = setTimeout(() => {
      setGlowOn(true)
      setPhase('warmup')
      after(1200, runCycle)
    }, delay * 1000)

    return () => {
      clearTimeout(warmup)
      clearAll()
    }
  }, [delay, runCycle])

  useEffect(() => {
    if (!borderRef.current) return
    gsap.killTweensOf(borderRef.current, 'boxShadow')
    if (mode !== 'neon') {
      gsap.set(borderRef.current, { boxShadow: 'none' })
      return
    }
    if (phase === 'hold-en' || phase === 'hold-zh') {
      gsap.to(borderRef.current, {
        boxShadow: `0 0 18px 4px ${effectiveGlowColor}, inset 0 0 12px 2px ${effectiveGlowColor}`,
        duration: 0.6,
        ease: 'power2.out',
      })
    } else {
      gsap.to(borderRef.current, {
        boxShadow: `0 0 8px 1px ${effectiveGlowColor}, inset 0 0 4px 1px ${effectiveGlowColor}`,
        duration: 0.4,
      })
    }
  }, [phase, effectiveGlowColor, mode])

  return { borderRef, displayText, isEnglish, phase, glowOn }
}
