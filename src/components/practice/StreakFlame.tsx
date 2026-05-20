'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'

interface Props {
  streak: number
}

const FLAME_FRAMES = [
  '/flames/streak_flame_1.png',
  '/flames/streak_flame_2.png',
  '/flames/streak_flame_3.png',
  '/flames/streak_flame_4.png',
  '/flames/streak_flame_5.png',
  '/flames/streak_flame_6.png',
]

function getFrameIndex(streak: number): number {
  if (streak >= 15) return 5
  if (streak >= 10) return 4
  if (streak >= 8)  return 3
  if (streak >= 6)  return 2
  if (streak >= 4)  return 1
  return 0
}

export function StreakFlame({ streak }: Props) {
  const containerRef                = useRef<HTMLDivElement>(null)
  const prevFrameRef                = useRef<number>(-1)
  const [frameIndex, setFrameIndex] = useState(() => getFrameIndex(streak))

  // Frame change and first-mount animation
  useEffect(() => {
    const next = getFrameIndex(streak)

    if (next > prevFrameRef.current && prevFrameRef.current !== -1) {
      // Frame upgrade — burst scale animation
      if (containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          { scale: 1 },
          {
            scale: 1.45,
            duration: 0.18,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              setFrameIndex(next)
              if (containerRef.current) {
                gsap.fromTo(
                  containerRef.current,
                  { opacity: 0.3, scale: 0.85 },
                  { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }
                )
              }
            },
          }
        )
      }
    } else if (prevFrameRef.current === -1) {
      // First mount — float in from left
      setFrameIndex(next)
      if (containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, scale: 0.7, x: -8 },
          { opacity: 1, scale: 1, x: 0, duration: 0.35, ease: 'back.out(1.4)' }
        )
      }
    } else {
      setFrameIndex(next)
    }

    prevFrameRef.current = next
  }, [streak])

  // Idle float — subtle vertical bob
  useEffect(() => {
    if (!containerRef.current) return
    const tween = gsap.to(containerRef.current, {
      y: -3,
      duration: 1.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
    return () => { tween.kill() }
  }, [])

  // Streak reset — shake then shrink out
  useEffect(() => {
    if (streak === 0 && containerRef.current) {
      gsap.to(containerRef.current, {
        x: 4,
        duration: 0.06,
        yoyo: true,
        repeat: 5,
        ease: 'none',
        onComplete: () => {
          if (containerRef.current) {
            gsap.to(containerRef.current, {
              scale: 0,
              opacity: 0,
              duration: 0.2,
              ease: 'power2.in',
            })
          }
        },
      })
      prevFrameRef.current = -1
    }
  }, [streak])

  if (streak < 2 && streak !== 0) return null

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
      style={{
        background: 'rgba(251,146,60,0.12)',
        border: '0.5px solid rgba(251,146,60,0.3)',
      }}
    >
      <div
        className="relative shrink-0"
        style={{ width: '28px', height: '18px' }}
      >
        <Image
          src={FLAME_FRAMES[frameIndex]}
          alt="streak flame"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      <span
        className="text-xs font-medium tabular-nums"
        style={{ color: '#fb923c' }}
      >
        {streak}
      </span>
    </div>
  )
}
