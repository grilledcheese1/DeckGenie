'use client'

import { useId, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { InfoIcon, ChevronDownIcon, BarChartIcon, StarIcon, TargetIcon } from './progressIcons'

export interface ActivityPoint {
  date: string
  rounds: number
  sentences: number
  /** whole-day accuracy %, or null if nothing practiced that day */
  accuracy: number | null
}

type Metric = 'rounds' | 'sentences'

const VB_W = 680
const VB_H = 200
const PAD = { t: 16, r: 14, b: 26, l: 30 }

// Period of the sweeping-light animation. MUST match `--activity-sweep`
// in globals.css — each dot's flare is delayed by its position along the
// line × this value so the flare lands as the light passes.
const SWEEP_SECONDS = 3.2

function niceMax(v: number, metric: Metric): number {
  const floor = metric === 'rounds' ? 2 : 5
  if (v <= floor) return floor
  const step = metric === 'rounds' ? 2 : 5
  return Math.ceil(v / step) * step
}

export function PracticeActivityChart({ points, loading, error }: {
  points: ActivityPoint[]
  loading: boolean
  error: string | null
}) {
  const [metric, setMetric] = useState<Metric>('rounds')
  const gradId = useId()

  const values = points.map(p => (metric === 'rounds' ? p.rounds : p.sentences))
  const maxY = niceMax(Math.max(0, ...values), metric)

  const innerW = VB_W - PAD.l - PAD.r
  const innerH = VB_H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.t + innerH - (v / maxY) * innerH

  const linePts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const areaPts = `${x(0)},${PAD.t + innerH} ${linePts} ${x(values.length - 1)},${PAD.t + innerH}`

  const totalRounds = points.reduce((s, p) => s + p.rounds, 0)
  const totalSentences = points.reduce((s, p) => s + p.sentences, 0)
  const bestDay = Math.max(0, ...points.map(p => (metric === 'rounds' ? p.rounds : p.sentences)))
  const gradedDone = points.reduce((s, p) => s + p.sentences, 0)
  const gradedCorrect = points.reduce((s, p) => s + (p.accuracy !== null ? Math.round((p.accuracy / 100) * p.sentences) : 0), 0)
  const avgAccuracy = gradedDone > 0 ? Math.round((gradedCorrect / gradedDone) * 100) : null

  const yTicks = [0, maxY / 2, maxY]
  // Thin out x labels so they don't collide on wide windows.
  const labelEvery = points.length > 16 ? 3 : points.length > 10 ? 2 : 1

  return (
    <Card padding="lg" className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Practice activity</h2>
          <span style={{ color: 'var(--text-tertiary)' }} title="Rounds or sentences completed per day over the selected window">
            <InfoIcon width={13} height={13} />
          </span>
        </div>
        <div className="relative inline-flex items-center">
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as Metric)}
            aria-label="Chart metric"
            className="appearance-none rounded-lg py-1.5 pl-3 pr-7 text-xs font-medium capitalize transition-colors hover-border"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="rounds">Rounds</option>
            <option value="sentences">Sentences</option>
          </select>
          <span className="pointer-events-none absolute right-2" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronDownIcon width={12} height={12} />
          </span>
        </div>
      </div>

      {error ? (
        <p className="py-8 text-xs" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load activity: {error}
        </p>
      ) : (
        <>
          <p className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {metric}
          </p>
          <svg
            className="activity-chart"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
            role="img"
            aria-label={`${metric} per day; ${metric === 'rounds' ? totalRounds : totalSentences} total over ${points.length} days`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
              <filter
                id={`${gradId}-glow`}
                filterUnits="userSpaceOnUse"
                x="0" y={-20} width={VB_W} height={VB_H + 40}
              >
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD.l} y1={y(t)} x2={VB_W - PAD.r} y2={y(t)}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 ? undefined : '3 3'}
                />
                <text
                  x={PAD.l - 6} y={y(t) + 3} textAnchor="end"
                  fontSize="10" fill="var(--text-tertiary)"
                >
                  {Number.isInteger(t) ? t : t.toFixed(0)}
                </text>
              </g>
            ))}

            <polygon points={areaPts} fill={`url(#${gradId})`} />

            {/* Base line with a soft bloom. */}
            <polyline
              points={linePts}
              fill="none" stroke="var(--accent)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              filter={`url(#${gradId}-glow)`}
            />

            {/* A bright segment that sweeps along the line, looping. */}
            {values.length > 1 && (
              <polyline
                className="activity-trace"
                points={linePts}
                pathLength={1}
                fill="none" stroke="var(--accent)" strokeOpacity="0.9" strokeWidth="3.5"
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="0.18 2"
                filter={`url(#${gradId}-glow)`}
              />
            )}

            {/* Dots: a glow halo that flares as the sweep passes, plus a crisp core. */}
            {values.map((v, i) => {
              const delay = values.length > 1 ? (i / (values.length - 1)) * SWEEP_SECONDS : 0
              return (
                <g key={i}>
                  <circle
                    className="activity-dot-halo"
                    cx={x(i)} cy={y(v)} r={7}
                    fill="var(--accent)"
                    style={{ animationDelay: `${delay}s` }}
                  />
                  <circle
                    cx={x(i)} cy={y(v)} r={v > 0 ? 3 : 2}
                    fill="var(--accent)"
                    filter={`url(#${gradId}-glow)`}
                  />
                </g>
              )
            })}

            {points.map((p, i) => (
              i % labelEvery === 0 ? (
                <text
                  key={p.date}
                  x={x(i)} y={VB_H - 8} textAnchor="middle"
                  fontSize="10" fill="var(--text-tertiary)"
                >
                  {p.date.slice(8, 10).replace(/^0/, '')}
                </text>
              ) : null
            ))}
          </svg>

          <div
            className="mt-4 grid grid-cols-3 gap-3 border-t pt-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <FooterStat icon={<BarChartIcon width={14} height={14} />} label={metric === 'rounds' ? 'Total rounds' : 'Total sentences'} value={String(metric === 'rounds' ? totalRounds : totalSentences)} />
            <FooterStat icon={<StarIcon width={14} height={14} />} label="Best day" value={`${bestDay} ${metric === 'rounds' ? (bestDay === 1 ? 'round' : 'rounds') : 'sent.'}`} />
            <FooterStat icon={<TargetIcon width={14} height={14} />} label="Avg. accuracy" value={avgAccuracy === null ? '—' : `${avgAccuracy}%`} />
          </div>
        </>
      )}
    </Card>
  )
}

function FooterStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}
