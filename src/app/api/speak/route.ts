import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { createClient } from '@/lib/supabase/server'

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text } = await req.json()
  if (typeof text !== 'string') return new Response('text must be a string', { status: 400 })
  const trimmed = text.trim()
  if (!trimmed) return new Response('text is empty', { status: 400 })
  if (trimmed.length > 2000) return new Response('text exceeds 2000 characters', { status: 400 })

  try {
    const audio = await elevenlabs.textToSpeech.convert(
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
