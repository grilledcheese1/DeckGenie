import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  let body: { apiKey?: unknown } = {}
  try { body = await req.json() } catch { /* no body */ }

  const apiKey = body?.apiKey
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    })
    return NextResponse.json({ valid: true })
  } catch (err) {
    // Never log the raw error — safe to inspect its *structured* fields
    // (Anthropic's own descriptive `error.type`/`error.message`, e.g.
    // "This API key is not scoped to a workspace...") since those never
    // echo back the caller-supplied key, but we don't log the request
    // itself. Surface that reason to the client instead of a bare
    // "invalid" — a syntactically-valid-but-unscoped key (a common
    // real case, confirmed while diagnosing this) reads as "wrong key"
    // otherwise, when the actual fix is generating a workspace-scoped
    // key in the Anthropic Console rather than retyping anything here.
    const reason = err instanceof Anthropic.APIError
      ? (err.error as { error?: { message?: string } } | undefined)?.error?.message
      : undefined
    return NextResponse.json({ valid: false, reason })
  }
}
