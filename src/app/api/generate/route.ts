import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { callClaudeJson, ClaudeResponseError } from '@/lib/llm'
import { GenerateResponse } from '@/types'

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.sentence_zh === 'string'
    && typeof v.sentence_py === 'string'
    && Array.isArray(v.vocab_used)
    && v.vocab_used.every(w => typeof w === 'string')
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  let body: { recent?: Array<{ zh: string; py: string }> } = {}
  try { body = await req.json() } catch { /* no body */ }
  const recent = Array.isArray(body?.recent) ? body.recent.slice(0, 5) : []

  const { data: vocab } = await supabase
    .from('vocab_list')
    .select('word_zh, pinyin, english, pos, times_seen, times_correct')
    .eq('user_id', user.id)

  if (!vocab || vocab.length < 5) {
    return NextResponse.json({ error: 'Not enough vocab words.' }, { status: 400 })
  }

  const sorted = [...vocab].sort((a, b) => {
    const accA = a.times_seen > 0 ? a.times_correct / a.times_seen : 0.5
    const accB = b.times_seen > 0 ? b.times_correct / b.times_seen : 0.5
    return accA - accB
  })

  const vocabCsv = sorted.map(w => `${w.word_zh},${w.pinyin},${w.english},${w.pos}`).join('\n')

  const varietyBlock = recent.length > 0
    ? `\nRECENT SENTENCES (do NOT reuse similar structure or phrasing):\n${
        recent.map((s, i) => `${i + 1}. ${s.zh}  [${s.py}]`).join('\n')
      }\n\nVARIETY RULES — the new sentence MUST differ from ALL recent sentences in at least 2 of these dimensions:\n1. Sentence type: declarative | 吗-question | 呢/吧-tag question | imperative | 如果…就… conditional\n2. Subject: pronoun (我/你/他) | proper noun | bare noun | noun phrase | topic-dropped\n3. Predicate: action verb | stative/psychological verb | adjective predicate | noun predicate\n4. Aspect/tense: none (habitual) | 了 completed | 过 experienced | 在/正在 ongoing | 要/想 intent\n5. Clause count: single clause | compound (因为/所以/但是/虽然/而且)\n6. Object: none | bare noun | 的-phrase modified noun\n`
    : ''

  const prompt = `You are a Chinese language tutor. Generate ONE natural Mandarin sentence for a student to translate into English.

RULES:
- Use ONLY words from the vocabulary list below (plus essential grammar particles: 的,了,吗,呢,吧,也,都,很,太,比,和,还,就,才,又,再,最,非常,因为,所以,但是,虽然)
- Sentence must be grammatically correct
- Difficulty: short to medium length (6–14 characters)
- Prefer words that appear earlier in the vocabulary list as they need more practice
${varietyBlock}
VOCABULARY (zh,pinyin,english,pos):
${vocabCsv}

Respond with ONLY valid JSON, no markdown:
{"sentence_zh":"...","sentence_py":"...","vocab_used":["zh_word1","zh_word2"]}`

  try {
    const parsed = await callClaudeJson(prompt, 256, isGenerateResponse)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    const status = err instanceof ClaudeResponseError ? 502 : 500
    return NextResponse.json({ error: 'Generation failed' }, { status })
  }
}
