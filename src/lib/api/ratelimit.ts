import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const BUDGETS = {
  // Cheap first-pass gate for /api/generate, checked before the settings
  // lookup that determines mode — protects that Supabase read itself from
  // being hammered by a client the real per-mode budgets below haven't even
  // classified yet. Not a replacement for them, just a pre-filter.
  generate_preflight: { limit: 30, window: '1 m' },
  // 'ai' mode spends the user's own Anthropic key, so this cap isn't a cost
  // control — it just stops the route itself from being hammered.
  generate_ai: { limit: 30, window: '1 m' },
  // 'static' mode only costs Supabase reads, so it gets the same light cap.
  generate_static: { limit: 30, window: '1 m' },
  // Grading always spends the app's own Anthropic key regardless of mode, so
  // it keeps the tight budget — this is the one endpoint that costs real
  // money on every call.
  grade: { limit: 15, window: '1 m' },
  speak: { limit: 10, window: '1 m' },
} as const satisfies Record<string, { limit: number; window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` }>

export type RateLimitBucket = keyof typeof BUDGETS

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const limiters = redis
  ? (Object.fromEntries(
      (Object.entries(BUDGETS) as [RateLimitBucket, typeof BUDGETS[RateLimitBucket]][]).map(
        ([bucket, { limit, window }]) => [
          bucket,
          new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, window),
            prefix: `ratelimit:${bucket}`,
          }),
        ]
      )
    ) as Record<RateLimitBucket, Ratelimit>)
  : null

export interface RateLimitResult {
  success: boolean
  retryAfterSeconds?: number
}

export async function checkRateLimit(userId: string, bucket: RateLimitBucket): Promise<RateLimitResult> {
  if (!limiters) {
    console.warn(
      `[ratelimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — skipping rate limit for "${bucket}" (failing open, local dev only)`
    )
    return { success: true }
  }

  const { success, reset } = await limiters[bucket].limit(userId)
  if (success) return { success: true }

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return { success: false, retryAfterSeconds }
}
