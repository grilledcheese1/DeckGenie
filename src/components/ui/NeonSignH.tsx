'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'

interface NeonSignHProps {
  english:    string
  chinese:    string
  color:      string
  glowColor:  string
  delay?:     number
  size?:      number   // multiplier applied to font sizes and box dimensions
  className?: string
  style?:     React.CSSProperties
}

type SignPhase =
  | 'warmup'
  | 'typing-en'
  | 'hold-en'
  | 'erasing-en'
  | 'typing-zh'
  | 'hold-zh'

const CHAR_TYPE_SPEED  = 80
const CHAR_ERASE_SPEED = 55
const HOLD_DURATION    = 1800
const RESTART_DELAY    = 3500

export function NeonSignH({
  english, chinese, color, glowColor,
  delay = 0, size = 1, className = '', style = {},
}: NeonSignHProps) {
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
  }, [delay, runCycle]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!borderRef.current) return
    if (phase === 'hold-en' || phase === 'hold-zh') {
      gsap.to(borderRef.current, {
        boxShadow: `0 0 18px 4px ${glowColor}, inset 0 0 12px 2px ${glowColor}`,
        duration: 0.6,
        ease: 'power2.out',
      })
    } else {
      gsap.to(borderRef.current, {
        boxShadow: `0 0 8px 1px ${glowColor}, inset 0 0 4px 1px ${glowColor}`,
        duration: 0.4,
      })
    }
  }, [phase, glowColor])

  return (
    <div className={`relative inline-flex items-center ${className}`} style={style}>
      <div
        ref={borderRef}
        className={`relative inline-flex items-center px-4 py-3 rounded-lg ${glowOn ? 'neon-warmup' : 'opacity-0'}`}
        style={{
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 8px 1px ${glowColor}, inset 0 0 4px 1px ${glowColor}`,
          minWidth: `${120 * size}px`,
          minHeight: `${42 * size}px`,
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        {/* Left decorative dot */}
        <div
          className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full neon-pulse"
          style={{ width: '5px', height: '5px', background: color, boxShadow: `0 0 6px 2px ${glowColor}` }}
        />

        {/* Text */}
        <div className="flex items-center gap-px mx-3">
          {displayText.split('').map((ch, i) => (
            <span
              key={`${i}-${ch}`}
              className={i === displayText.length - 1 ? 'neon-pulse' : 'neon-flicker'}
              style={{
                color,
                fontSize: isEnglish ? `${12 * size}px` : `${20 * size}px`,
                fontWeight: isEnglish ? 600 : 400,
                fontFamily: isEnglish ? 'var(--font-sans)' : 'var(--font-hanzi), serif',
                textShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                letterSpacing: isEnglish ? '0.2em' : '0.05em',
                lineHeight: 1,
              }}
            >
              {ch}
            </span>
          ))}

          {(phase === 'typing-en' || phase === 'typing-zh' || phase === 'erasing-en') && (
            <span
              style={{
                color,
                fontSize: isEnglish ? `${12 * size}px` : `${20 * size}px`,
                textShadow: `0 0 8px ${color}`,
                animation: 'neon-pulse 0.6s ease-in-out infinite',
                lineHeight: 1,
              }}
            >
              |
            </span>
          )}
        </div>

        {/* Right decorative dot */}
        <div
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full neon-pulse"
          style={{ width: '5px', height: '5px', background: color, boxShadow: `0 0 6px 2px ${glowColor}` }}
        />
      </div>
    </div>
  )
}
