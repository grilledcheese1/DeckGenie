import { NextResponse } from 'next/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { requireUser } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/ratelimit'

let elevenlabs: ElevenLabsClient | undefined

function getElevenLabsClient() {
  if (!elevenlabs) {
    elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  }
  return elevenlabs
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  const rateLimit = await checkRateLimit(user.id, 'speak')
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const { text } = await req.json()
  if (typeof text !== 'string') return new Response('text must be a string', { status: 400 })
  const trimmed = text.trim()
  if (!trimmed) return new Response('text is empty', { status: 400 })
  if (trimmed.length > 2000) return new Response('text exceeds 2000 characters', { status: 400 })

  try {
    const audio = await getElevenLabsClient().textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID!,
      { text: trimmed, modelId: process.env.ELEVENLABS_MODEL_ID }
    )
    return new Response(audio as unknown as ReadableStream, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    console.error('[speak] error:', err)
    return new Response('TTS failed', { status: 500 })
  }
}
