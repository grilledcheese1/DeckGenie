'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { gsap } from 'gsap'

/**
 * Imperative handle exposed by InkButton so a parent (Button) can trigger the
 * click "ink splash" pulse without reaching into InkButton's internal refs.
 */
export interface InkButtonHandle {
  /** Plays the small scale+opacity ink-splash pulse. Call on click. */
  pulse: () => void
}

interface InkButtonProps {
  /** Ring diameter in px. Default 16. */
  size?: number
  className?: string
}

/**
 * Chinese-styling enso-ring primitive used inside Button's `primary` variant
 * (via `icon="ink"`). An irregular, hand-drawn-looking ring — not a perfect
 * circle — draws itself in once on mount, and pulses a soft ink-splash on
 * click (triggered imperatively by the parent Button via `ref`).
 */
export const InkButton = forwardRef<InkButtonHandle, InkButtonProps>(function InkButton(
  { size = 16, className = '' },
  ref
) {
  const ringRef   = useRef<SVGPathElement>(null)
  const splashRef = useRef<SVGCircleElement>(null)

  // Draw the ring in once on mount. Empty dep array is deliberate — this is a
  // "used dozens of times per session" button; re-triggering the stroke draw
  // on every re-render (e.g. parent state changes) would feel busy.
  useEffect(() => {
    const path = ringRef.current
    if (!path) return
    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length })
    const tween = gsap.fromTo(
      path,
      { strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }
    )
    return () => { tween.kill() }
  }, [])

  useImperativeHandle(ref, () => ({
    pulse() {
      const splash = splashRef.current
      if (!splash) return
      gsap.killTweensOf(splash)
      gsap.fromTo(
        splash,
        { scale: 0.4, opacity: 0.6, transformOrigin: '50% 50%' },
        { scale: 1.6, opacity: 0, duration: 0.45, ease: 'power2.out' }
      )
    },
  }), [])

  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="absolute inset-0">
        {/* Ink splash — hidden until pulsed */}
        <circle ref={splashRef} cx="12" cy="12" r="9" fill="var(--enso-ring-color)" style={{ opacity: 0 }} />
        {/* Enso ring — deliberately irregular, not a perfect circle */}
        <path
          ref={ringRef}
          d="M12.4 3.6c4.1-.2 7.9 2.9 8.2 7.2.3 3.5-1.7 6.9-5 8.3-3.4 1.5-7.5.4-9.7-2.6-1.9-2.6-1.8-6.3.3-8.8 1.1-1.3 2.5-2.1 4.1-2.5"
          stroke="var(--enso-ring-color)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  )
})
