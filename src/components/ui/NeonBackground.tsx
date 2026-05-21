'use client'

import { NeonSign } from './NeonSign'

interface Props {
  count?:     3 | 4 | 5
  opacity?:   number
  className?: string
}

const SIGNS = [
  { english: 'STUDY',    chinese: '学习', color: '#00fff5', glowColor: 'rgba(0,255,245,0.35)' },
  { english: 'PERSIST',  chinese: '坚持', color: '#ff2d78', glowColor: 'rgba(255,45,120,0.35)' },
  { english: 'PROGRESS', chinese: '进步', color: '#ffb800', glowColor: 'rgba(255,184,0,0.35)' },
  { english: 'FOCUS',    chinese: '专注', color: '#bf5fff', glowColor: 'rgba(191,95,255,0.35)' },
  { english: 'JOURNEY',  chinese: '旅程', color: '#00ff88', glowColor: 'rgba(0,255,136,0.35)' },
]

const POSITIONS = [
  // 3-sign layout
  [
    { left: '4%',  top: '8%' },
    { right: '4%', top: '15%' },
    { left: '6%',  bottom: '12%' },
  ],
  // 4-sign layout
  [
    { left: '3%',  top: '6%' },
    { right: '3%', top: '12%' },
    { left: '5%',  bottom: '10%' },
    { right: '5%', bottom: '15%' },
  ],
  // 5-sign layout
  [
    { left: '2%',  top: '5%' },
    { right: '2%', top: '10%' },
    { left: '4%',  top: '45%' },
    { right: '4%', bottom: '12%' },
    { left: '45%', bottom: '5%' },
  ],
]

export function NeonBackground({ count = 3, opacity = 1, className = '' }: Props) {
  const posIndex    = count - 3
  const positions   = POSITIONS[posIndex] ?? POSITIONS[0]
  const signsToShow = SIGNS.slice(0, count)

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity, zIndex: 0 }}
      aria-hidden="true"
    >
      {signsToShow.map((sign, i) => (
        <NeonSign
          key={sign.english}
          english={sign.english}
          chinese={sign.chinese}
          color={sign.color}
          glowColor={sign.glowColor}
          delay={i * 1.4}
          className="absolute"
          style={positions[i] as React.CSSProperties}
        />
      ))}
    </div>
  )
}
