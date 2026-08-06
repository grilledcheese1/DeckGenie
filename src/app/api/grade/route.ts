import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { callClaudeJson, ClaudeResponseError } from '@/lib/llm'
import { GradeRequest, GradeResponse } from '@/types'

function isGradeResponse(value: unknown): value is GradeResponse {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.correct === 'boolean'
    && typeof v.score === 'number'
    && typeof v.feedback === 'string'
    && typeof v.correct_answer === 'string'
}

const STRICTNESS: Record<number, string> = {
  1: 'Lenient: accept if the core meaning is conveyed, ignore grammar/phrasing errors',
  2: 'Balanced: meaning must be clear and natural, minor phrasing differences are ok',
  3: 'Strict: translation must be precise and idiomatic, penalise missing nuance',
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

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
    const parsed = await callClaudeJson(prompt, 200, isGradeResponse)
    parsed.correct = parsed.score >= 70

    // Tracking writes are fire-and-forget — never block or fail the grade response
    if (vocab_used?.length) {
      Promise.all(vocab_used.map(zh =>
        supabase.rpc('record_word_attempt', {
          p_word_zh: zh,
          p_correct: parsed.correct,
        })
      )).catch(err => console.error('record_word_attempt error:', err))
    }

    supabase.from('sentence_attempts').insert({
      user_id:         user.id,
      sentence_zh,
      sentence_py,
      user_answer:     body.user_answer,
      correct_answer:  parsed.correct_answer,
      score:           parsed.score,
      correct:         parsed.correct,
      strictness_used: strictness,
      vocab_used:      vocab_used ?? [],
    }).then(({ error }) => {
      if (error) console.error('sentence_attempts insert error:', error.message)
    })

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Grade error:', err)
    const status = err instanceof ClaudeResponseError ? 502 : 500
    return NextResponse.json({ error: 'Grading failed' }, { status })
  }
}
