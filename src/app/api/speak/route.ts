import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js'
import { Readable } from 'stream'
import { createClient } from '@/lib/supabase/server'

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text } = await req.json()
  if (!text) return new Response('Missing text', { status: 400 })

  try {
    const audio = await elevenlabs.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID!,
      { text, modelId: process.env.ELEVENLABS_MODEL_ID }
    )
    // Readable.fromWeb converts Web ReadableStream → Node.js Readable (AsyncIterable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    play(Readable.fromWeb(audio as any)).catch(console.error)
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[speak] error:', err)
    return new Response('TTS failed', { status: 500 })
  }
}
