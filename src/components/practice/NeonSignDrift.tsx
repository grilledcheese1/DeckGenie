'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  motion, useMotionValue, useAnimationFrame, useReducedMotion, animate,
  type MotionValue,
} from 'motion/react'
import { NeonSign } from '@/components/ui/NeonSign'
import { NEON_SIGN_COLOR, neonGlowFor, NEON_DRIFT_PHRASES } from '@/lib/neonSignPresets'
import { useSignMode } from '@/hooks/useSignMode'

/* ── tunables ────────────────────────────────────────────────────────
   (reviewed against the emil-design-eng drag-with-inertia guidance) */
const SIGN_COUNT       = 7
const DRIFT_SPEED      = 16      // px/s, upward, while idle
const WRAP_MARGIN      = 24      // px off-panel slack each end (> the neon glow radius)
const EDGE_FADE        = 24      // px mask fade at the panel's top & bottom
const SIGN_H_PER_SIZE  = 140     // ≈ rendered sign height per unit `size`
const SIGN_W_PER_SIZE  = 42      // ≈ rendered sign width per unit `size` (+ padding/border below)
const FRAME_CLAMP_MS   = 64      // ignore huge deltas after a background-tab return

const SAMPLE_WINDOW_MS = 90      // rolling window for release-velocity
const FLICK_THRESHOLD  = 0.08    // px/ms — below this, no fling (gentler than a dismissal gesture)
const INERTIA = { power: 0.5, timeConstant: 325, restDelta: 0.5 } as const
const X_RUBBER  = 0.15          // resistance past the horizontal bounds while dragging
const X_PROJECT = 0.05          // how far a horizontal flick throws the sign (× release px/s)
const X_SPRING  = { stiffness: 300, damping: 30 } as const

// per-sign spread across the signs
const SIZES    = [0.80, 0.95, 0.85, 0.90, 0.82, 0.88, 0.84]
const X_PCT    = [6, 52, 26, 72, 40, 16, 62]              // `left` as % of panel width
const OPACITY  = [0.78, 0.88, 0.72, 0.84, 0.74, 0.82, 0.76]
const DELAYS_S = [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60]  // staggered glow warm-up

const EDGE_FADE_MASK =
  `linear-gradient(to bottom, transparent 0, #000 ${EDGE_FADE}px, #000 calc(100% - ${EDGE_FADE}px), transparent 100%)`

type DriftState = 'drifting' | 'dragging' | 'inertia'

interface SignConfig {
  id: string
  en: string
  zh: string
  size: number
  xPct: number
  opacity: number
  delayS: number
  signH: number
  signW: number
}

interface SignHandle {
  id: string
  y: MotionValue<number>
  signH: number
  getState: () => DriftState
  setState: (s: DriftState) => void
  wasTouched: () => boolean
  /** Stop only the Y coast — used by the RAF drift hand-off. */
  stopY: () => void
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Seamless infinite loop: once a sign is fully past an edge, jump it one
 *  full span to the opposite side. Symmetric, so downward flings wrap too. */
function wrapY(y: MotionValue<number>, signH: number, panelH: number) {
  const span = panelH + signH + 2 * WRAP_MARGIN
  const v = y.get()
  if (v < -signH - WRAP_MARGIN) y.set(v + span)
  else if (v > panelH + WRAP_MARGIN) y.set(v - span)
}

/**
 * The empty space below `PracticeRightRail`'s quote card, filled with a
 * bounded panel of small vertical `NeonSign`s that drift slowly upward and
 * wrap around. Each sign is grab-and-drag (`grab` cursor, pointer capture):
 * Y flings with release inertia and loops (fling up or down, coast, resume
 * drifting from where it landed); X drags and flings too but is bounded to
 * the panel's width — a sign can't leave its space sideways.
 *
 * Decorative and pointer-only (`aria-hidden`); no keyboard affordance.
 * Honours reduced motion (no drift, no coast). Rail is `hidden` below the
 * `xl` breakpoint, so on narrow screens this is measured at height 0 and
 * renders nothing.
 */
export function NeonSignDrift() {
  const mode   = useSignMode()
  const reduce = useReducedMotion() ?? false

  const panelRef  = useRef<HTMLDivElement>(null)
  const panelHRef = useRef(0)
  const panelWRef = useRef(0)
  const [panelH, setPanelH] = useState(0)          // state only to trigger the one-time spread
  const registry  = useRef(new Map<string, SignHandle>())
  const didSpread = useRef(false)

  const configs = useMemo<SignConfig[]>(
    () => NEON_DRIFT_PHRASES.slice(0, SIGN_COUNT).map((p, i) => ({
      id: p.zh, en: p.en, zh: p.zh,
      size: SIZES[i], xPct: X_PCT[i], opacity: OPACITY[i], delayS: DELAYS_S[i],
      signH: Math.round(SIGN_H_PER_SIZE * SIZES[i]),
      signW: Math.round(SIGN_W_PER_SIZE * SIZES[i] + 30),   // + px-3 padding + border
    })),
    [],
  )

  const register   = useCallback((h: SignHandle) => { registry.current.set(h.id, h) }, [])
  const unregister = useCallback((id: string)    => { registry.current.delete(id) }, [])

  // Measure the panel's rendered height for the wrap-around math.
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      panelHRef.current = rect.height
      panelWRef.current = rect.width
      if (rect.height > 0) setPanelH(rect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // One-time spread once the panel has a real height and the signs have
  // registered. Skips any sign the user has already grabbed.
  useEffect(() => {
    if (!panelH || didSpread.current) return
    const handles = [...registry.current.values()]
    if (handles.length === 0) return
    handles.forEach((s, i) => {
      if (s.wasTouched()) return
      if (reduce) {
        const n = Math.max(handles.length - 1, 1)
        s.y.set((i / n) * Math.max(panelH - s.signH, 0))   // even, fully on-screen, static
      } else {
        const span = panelH + s.signH + 2 * WRAP_MARGIN
        s.y.set(-s.signH - WRAP_MARGIN + ((i + 0.5) / handles.length) * span)
      }
    })
    didSpread.current = true
  }, [panelH, reduce])

  // Single shared drift + wrap loop for every sign.
  useAnimationFrame((_t, deltaMs) => {
    const h = panelHRef.current
    if (!h || reduce) return
    const dt = Math.min(deltaMs, FRAME_CLAMP_MS) / 1000
    for (const s of registry.current.values()) {
      const st = s.getState()
      if (st === 'dragging') continue
      if (st === 'drifting') {
        s.y.set(s.y.get() - DRIFT_SPEED * dt)
      } else if (Math.abs(s.y.getVelocity()) < DRIFT_SPEED * 1.5) {
        // Y inertia has decayed to a crawl — hand off to drift now so
        // there's no visible velocity step at the end of the coast. (An
        // X fling, if any, keeps coasting independently.)
        s.stopY()
        s.setState('drifting')
      }
      wrapY(s.y, s.signH, h)                      // runs for 'drifting' and 'inertia'
    }
  })

  return (
    <div
      ref={panelRef}
      aria-hidden="true"
      className="relative flex-1 min-h-[340px] overflow-hidden"
      style={{ WebkitMaskImage: EDGE_FADE_MASK, maskImage: EDGE_FADE_MASK }}
    >
      {panelH > 0 && configs.map(cfg => (
        <DriftSign
          key={cfg.id}
          config={cfg}
          mode={mode}
          reduce={reduce}
          panelHRef={panelHRef}
          panelWRef={panelWRef}
          register={register}
          unregister={unregister}
        />
      ))}
    </div>
  )
}

interface DriftSignProps {
  config: SignConfig
  mode: ReturnType<typeof useSignMode>
  reduce: boolean
  panelHRef: React.RefObject<number>
  panelWRef: React.RefObject<number>
  register: (h: SignHandle) => void
  unregister: (id: string) => void
}

function DriftSign({ config, mode, reduce, panelHRef, panelWRef, register, unregister }: DriftSignProps) {
  const x = useMotionValue(0)                             // horizontal drag offset from the `left:%` anchor
  const y = useMotionValue(-config.signH)                 // off-panel until the spread effect runs
  const [grabbing, setGrabbing] = useState(false)

  const stateRef   = useRef<DriftState>('drifting')
  const touchedRef = useRef(false)
  const coastYRef  = useRef<ReturnType<typeof animate> | null>(null)
  const coastXRef  = useRef<ReturnType<typeof animate> | null>(null)
  const pointerId  = useRef<number | null>(null)
  const startRef   = useRef({ pointerX: 0, pointerY: 0, motionX: 0, motionY: 0 })
  const samples    = useRef<{ x: number; y: number; t: number }[]>([])

  function stopCoasts() {
    coastYRef.current?.stop(); coastYRef.current = null
    coastXRef.current?.stop(); coastXRef.current = null
  }

  useEffect(() => {
    register({
      id: config.id,
      y,
      signH: config.signH,
      getState: () => stateRef.current,
      setState: s => { stateRef.current = s },
      wasTouched: () => touchedRef.current,
      stopY: () => { coastYRef.current?.stop(); coastYRef.current = null },
    })
    return () => { unregister(config.id); stopCoasts() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hard invariant: a sign never rests outside the panel horizontally.
  // The rubber-band gives while you're dragging; the moment you're not,
  // any out-of-bounds `x` (spring overshoot, a wild flick) snaps back.
  useEffect(() => {
    return x.on('change', v => {
      if (stateRef.current === 'dragging') return
      const { min, max } = xBounds()
      if (v < min) x.set(min)
      else if (v > max) x.set(max)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Horizontal bounds (in `x` offset units) that keep the sign inside the
   *  panel. Unbounded until the panel width is measured. */
  function xBounds() {
    const pw = panelWRef.current
    if (!pw) return { min: -Infinity, max: Infinity }
    const leftPx = (config.xPct / 100) * pw
    return { min: -leftPx, max: Math.max(pw - config.signW - leftPx, -leftPx) }
  }

  function softBoundX(raw: number) {
    const { min, max } = xBounds()
    if (raw < min) return min + (raw - min) * X_RUBBER
    if (raw > max) return max + (raw - max) * X_RUBBER
    return raw
  }

  function resumeDrift() {
    const h = panelHRef.current
    if (h) wrapY(y, config.signH, h)
    stateRef.current = 'drifting'
  }

  function releasePointer(e: React.PointerEvent<HTMLDivElement>): boolean {
    if (e.pointerId !== pointerId.current) return false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    pointerId.current = null
    setGrabbing(false)
    return true
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerId.current !== null) return                // multi-touch guard: ignore extra pointers
    stopCoasts()
    pointerId.current = e.pointerId
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    touchedRef.current = true
    stateRef.current = 'dragging'
    setGrabbing(true)
    startRef.current = { pointerX: e.clientX, pointerY: e.clientY, motionX: x.get(), motionY: y.get() }
    samples.current = [{ x: x.get(), y: y.get(), t: performance.now() }]
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== pointerId.current) return
    const st = startRef.current
    x.set(softBoundX(st.motionX + (e.clientX - st.pointerX)))
    y.set(st.motionY + (e.clientY - st.pointerY))
    const now = performance.now()
    const s = samples.current
    s.push({ x: x.get(), y: y.get(), t: now })
    while (s.length > 2 && now - s[0].t > SAMPLE_WINDOW_MS) s.shift()
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!releasePointer(e)) return
    const s = samples.current
    const first = s[0]
    const last = s[s.length - 1]
    const dtMs = Math.max(last.t - first.t, 1)
    const vxPxMs = (last.x - first.x) / dtMs
    const vyPxMs = (last.y - first.y) / dtMs
    const panelH = panelHRef.current ?? 0
    const { min: xMin, max: xMax } = xBounds()

    // ── X: momentum, but always lands inside the panel. A velocity-seeded
    //    spring toward a clamped projected target — carries the flick's
    //    momentum, decelerates naturally, can't overshoot out of bounds. ──
    if (reduce) {
      x.set(clamp(x.get(), xMin, xMax))
    } else {
      const xTarget = clamp(x.get() + vxPxMs * 1000 * X_PROJECT, xMin, xMax)
      coastXRef.current = animate(x, xTarget, {
        type: 'spring',
        stiffness: X_SPRING.stiffness,
        damping: X_SPRING.damping,
        velocity: vxPxMs * 1000,
      })
    }

    // ── Y: drift / loop / fling ──
    if (reduce) {
      y.set(clamp(y.get(), 0, Math.max(panelH - config.signH, 0)))
      stateRef.current = 'drifting'
      return
    }
    if (Math.abs(vyPxMs) < FLICK_THRESHOLD) {
      resumeDrift()
      return
    }
    if (panelH) wrapY(y, config.signH, panelH)            // fold a fully off-panel sign back (off-screen)
    stateRef.current = 'inertia'
    coastYRef.current = animate(y, y.get(), {
      type: 'inertia',
      velocity: vyPxMs * 1000,                            // motion wants px/s
      power: INERTIA.power,
      timeConstant: INERTIA.timeConstant,
      restDelta: INERTIA.restDelta,
    })
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!releasePointer(e)) return
    const { min, max } = xBounds()
    x.set(clamp(x.get(), min, max))
    stateRef.current = 'drifting'
  }

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${config.xPct}%`,
        top: 0,
        x,
        y,
        opacity: config.opacity,
        cursor: grabbing ? 'grabbing' : 'grab',
        touchAction: 'none',
        willChange: 'transform',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <NeonSign
        english={config.en}
        chinese={config.zh}
        color={NEON_SIGN_COLOR}
        glowColor={neonGlowFor(mode)}
        mode={mode}
        size={config.size}
        delay={config.delayS}
        static
      />
    </motion.div>
  )
}
