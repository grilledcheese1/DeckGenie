'use client'

import { useTypewriterCycle } from '@/hooks/useTypewriterCycle'

export type SignMode = 'neon' | 'vermillion' | 'bamboo'

interface NeonSignProps {
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
  /** Render a static idiom (Chinese only, no typewriter type/erase cycle). */
  static?:         boolean
}

export function NeonSign({
  english, chinese, color,
  delay = 0, size = 1, mode = 'neon', fadeInDuration = 1.5, glowColor = '', className = '', style = {},
  static: isStatic = false,
}: NeonSignProps) {
  const isNeon = mode === 'neon'
  const effectiveGlowColor = glowColor || color

  const { borderRef, displayText, isEnglish, phase, glowOn } = useTypewriterCycle({
    english, chinese, delay, mode, effectiveGlowColor, staticMode: isStatic,
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

  const chars = displayText.split('')

  const borderClassName = `relative flex flex-col items-center justify-start px-3 py-4 rounded-lg`

  const borderStyle: React.CSSProperties = {
    border:     S.border,
    boxShadow:  S.boxShadow,
    minWidth:   `${42 * size}px`,
    minHeight:  `${120 * size}px`,
    background: S.bg,
    opacity:    glowOn ? 1 : 0,
    transition: `opacity ${fadeInDuration}s ease`,
  }

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={style}
    >
      <div ref={borderRef} className={borderClassName} style={borderStyle}>
        <div className="flex flex-col items-center gap-0.5">
          {chars.map((ch, i) => (
            <span
              key={`${i}-${ch}`}
              className={isNeon
                ? (i === chars.length - 1 ? 'neon-pulse' : 'neon-flicker')
                : ''}
              style={{
                color:        S.textColor,
                fontSize:     isEnglish ? `${11 * size}px` : `${18 * size}px`,
                fontWeight:   isEnglish ? 500 : 400,
                fontFamily:   isEnglish ? 'var(--font-sans)' : 'var(--font-hanzi), serif',
                textShadow:   S.textShadow,
                letterSpacing: isEnglish ? '0.15em' : '0',
                writingMode:  'vertical-rl' as const,
                lineHeight:   'none',
              }}
            >
              {ch}
            </span>
          ))}

          {(phase === 'typing-en' || phase === 'typing-zh' || phase === 'erasing-en') && (
            <span
              style={{
                color:      S.textColor,
                fontSize:   isEnglish ? `${11 * size}px` : `${18 * size}px`,
                textShadow: S.cursorShadow,
                animation:  isNeon ? 'neon-pulse 0.6s ease-in-out infinite' : 'none',
                lineHeight: 1,
              }}
            >
              |
            </span>
          )}
        </div>

        <div
          className={`absolute top-1.5 left-1/2 -translate-x-1/2 rounded-full${isNeon ? ' neon-pulse' : ''}`}
          style={{ width: '5px', height: '5px', background: S.dotColor, boxShadow: S.dotShadow }}
        />
        <div
          className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full${isNeon ? ' neon-pulse' : ''}`}
          style={{ width: '5px', height: '5px', background: S.dotColor, boxShadow: S.dotShadow }}
        />
      </div>
    </div>
  )
}
