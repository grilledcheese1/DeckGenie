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
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    })
    return NextResponse.json({ valid: true })
  } catch {
    // Never log the error — it may embed the caller-supplied key.
    return NextResponse.json({ valid: false })
  }
}
