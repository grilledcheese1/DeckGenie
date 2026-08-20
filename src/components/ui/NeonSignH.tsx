'use client'

import { useTypewriterCycle } from '@/hooks/useTypewriterCycle'
import type { SignMode } from './NeonSign'

interface NeonSignHProps {
  english:    string
  chinese:    string
  color:       string
  glowColor?:  string
  delay?:          number
  size?:           number
  mode?:           SignMode
  fadeInDuration?: number
  className?:      string
  style?:          React.CSSProperties
}

export function NeonSignH({
  english, chinese, color,
  delay = 0, size = 1, mode = 'neon', fadeInDuration = 1.5, glowColor = '', className = '', style = {},
}: NeonSignHProps) {
  const isNeon = mode === 'neon'
  const effectiveGlowColor = glowColor || color

  const { borderRef, displayText, isEnglish, phase, glowOn } = useTypewriterCycle({
    english, chinese, delay, mode, effectiveGlowColor,
  })

  const S = mode === 'vermillion' ? {
    bg:          'rgba(192,57,43,0.06)',
    border:      '1.5px solid rgba(192,57,43,0.5)',
    boxShadow:   'none',
    textColor:   '#c0392b',
    textShadow:  'none',
    cursorShadow:'none',
    dotColor:    '#c0392b',
    dotShadow:   'none',
  } : mode === 'bamboo' ? {
    bg:          'rgba(77,124,95,0.06)',
    border:      '1.5px solid rgba(77,124,95,0.5)',
    boxShadow:   'none',
    textColor:   '#4d7c5f',
    textShadow:  'none',
    cursorShadow:'none',
    dotColor:    '#4d7c5f',
    dotShadow:   'none',
  } : {
    bg:          'rgba(0,0,0,0.35)',
    border:      `1.5px solid ${color}`,
    boxShadow:   `0 0 8px 1px ${effectiveGlowColor}, inset 0 0 4px 1px ${effectiveGlowColor}`,
    textColor:   color,
    textShadow:  `0 0 8px ${color}, 0 0 16px ${color}`,
    cursorShadow:`0 0 8px ${color}`,
    dotColor:    color,
    dotShadow:   `0 0 6px 2px ${effectiveGlowColor}`,
  }

  const borderClassName = `relative inline-flex items-center px-4 py-3 rounded-lg`

  const borderStyle: React.CSSProperties = {
    border:     S.border,
    boxShadow:  S.boxShadow,
    minWidth:   `${120 * size}px`,
    minHeight:  `${42 * size}px`,
    background: S.bg,
    opacity:    glowOn ? 1 : 0,
    transition: `opacity ${fadeInDuration}s ease`,
  }

  return (
    <div className={`relative inline-flex items-center ${className}`} style={style}>
      <div ref={borderRef} className={borderClassName} style={borderStyle}>
        {/* Left decorative dot */}
        <div
          className={`absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full${isNeon ? ' neon-pulse' : ''}`}
          style={{ width: '5px', height: '5px', background: S.dotColor, boxShadow: S.dotShadow }}
        />

        {/* Text */}
        <div className="flex items-center gap-px mx-3">
          {displayText.split('').map((ch, i) => (
            <span
              key={`${i}-${ch}`}
              className={isNeon
                ? (i === displayText.length - 1 ? 'neon-pulse' : 'neon-flicker')
                : ''}
              style={{
                color:         S.textColor,
                fontSize:      isEnglish ? `${12 * size}px` : `${20 * size}px`,
                fontWeight:    isEnglish ? 600 : 400,
                fontFamily:    isEnglish ? 'var(--font-sans)' : 'var(--font-hanzi), serif',
                textShadow:    S.textShadow,
                letterSpacing: isEnglish ? '0.2em' : '0.05em',
                lineHeight:    1,
              }}
            >
              {ch}
            </span>
          ))}

          {(phase === 'typing-en' || phase === 'typing-zh' || phase === 'erasing-en') && (
            <span
              style={{
                color:      S.textColor,
                fontSize:   isEnglish ? `${12 * size}px` : `${20 * size}px`,
                textShadow: S.cursorShadow,
                animation:  isNeon ? 'neon-pulse 0.6s ease-in-out infinite' : 'none',
                lineHeight: 1,
              }}
            >
              |
            </span>
          )}
        </div>

        {/* Right decorative dot */}
        <div
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full${isNeon ? ' neon-pulse' : ''}`}
          style={{ width: '5px', height: '5px', background: S.dotColor, boxShadow: S.dotShadow }}
        />
      </div>
    </div>
  )
}
