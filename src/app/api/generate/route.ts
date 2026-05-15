import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: vocab } = await supabase
    .from('vocab_list')
    .select('word_zh, pinyin, english, pos')
    .eq('user_id', user.id)

  if (!vocab || vocab.length < 5) {
    return NextResponse.json({ error: 'Not enough vocab words.' }, { status: 400 })
  }

  const vocabCsv = vocab.map(w => `${w.word_zh},${w.pinyin},${w.english},${w.pos}`).join('\n')

  const prompt = `You are a Chinese language tutor. Generate ONE natural Mandarin sentence for a student to translate into English.

RULES:
- Use ONLY words from the vocabulary list below (plus essential grammar particles: 的,了,吗,呢,吧,也,都,很,太,比,和,还,就,才,又,再,最,非常,因为,所以,但是,虽然)
- Sentence must be grammatically correct
- Difficulty: short to medium length (6–14 characters)

VOCABULARY (zh,pinyin,english,pos):
${vocabCsv}

Respond with ONLY valid JSON, no markdown:
{"sentence_zh":"...","sentence_py":"...","vocab_used":["zh_word1","zh_word2"]}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json(JSON.parse(raw))
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
