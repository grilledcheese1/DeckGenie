import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { GradeRequest } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const STRICTNESS: Record<number, string> = {
  1: 'Lenient: accept if the core meaning is conveyed, ignore grammar/phrasing errors',
  2: 'Balanced: meaning must be clear and natural, minor phrasing differences are ok',
  3: 'Strict: translation must be precise and idiomatic, penalise missing nuance',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: GradeRequest = await req.json()
  const { user_answer, sentence_zh, sentence_py, strictness, vocab_used } = body

  if (!user_answer?.trim() || !sentence_zh) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const prompt = `You are grading a Chinese-to-English translation exercise.

Chinese sentence: ${sentence_zh}
Pinyin: ${sentence_py}
Student's translation: "${user_answer}"

Grading mode: ${STRICTNESS[strictness] ?? STRICTNESS[2]}

Respond with ONLY valid JSON, no markdown:
{"correct":true or false,"score":0-100,"feedback":"one concise sentence","correct_answer":"the most natural English translation"}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(raw)
    parsed.correct = parsed.score >= 70

    if (vocab_used?.length) {
      for (const zh of vocab_used) {
        supabase.from('vocab_list')
          .update({ times_seen: supabase.rpc('increment', { x: 1 }) as unknown as number })
          .eq('user_id', user.id).eq('word_zh', zh).then(() => {})
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Grade error:', err)
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 })
  }
}
