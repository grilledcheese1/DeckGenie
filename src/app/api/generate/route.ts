import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/ratelimit'
import { callClaudeJson, ClaudeResponseError } from '@/lib/llm'
import { selectStaticSentence } from '@/lib/staticSentences'
import { GenerateResponse } from '@/types'

type ClaudeSentence = Omit<GenerateResponse, 'sentence_id'>

function isClaudeSentence(value: unknown): value is ClaudeSentence {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.sentence_zh === 'string'
    && typeof v.sentence_py === 'string'
    && Array.isArray(v.vocab_used)
    && v.vocab_used.every(w => typeof w === 'string')
}

// recent entries are echoed back by the client from prior responses — the
// declared request body type is a compile-time assertion only, not runtime
// validation of req.json()'s actual (any-typed) result. Every entry ends up
// either in a Supabase filter or interpolated into the LLM prompt, so
// malformed/oversized values must be dropped and bounded here.
const MAX_RECENT_FIELD_LENGTH = 200

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Cheap gate before the settings lookup below, so a client hammering this
  // route can't force an unbounded number of Supabase reads while we don't
  // yet know its mode (and therefore which real budget applies).
  const preflight = await checkRateLimit(user.id, 'generate_preflight')
  if (!preflight.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(preflight.retryAfterSeconds) } }
    )
  }

  // practice_mode is read before the real rate-limit check so the budget can
  // be chosen per mode — 'ai' spends the user's own key (no budget
  // protection needed, just a light anti-hammering cap) while 'static' only
  // costs Supabase reads (same light cap, for a different reason).
  const { data: userSettings } = await supabase
    .from('settings')
    .select('practice_mode')
    .eq('user_id', user.id)
    .single()

  const practiceMode = userSettings?.practice_mode ?? 'static'

  const rateLimit = await checkRateLimit(user.id, practiceMode === 'ai' ? 'generate_ai' : 'generate_static')
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  let body: { recent?: Array<{ zh: string; py: string }> } = {}
  try { body = await req.json() } catch { /* no body */ }
  const rawRecent = Array.isArray(body?.recent) ? body.recent.slice(0, 5) : []
  const recent = rawRecent
    .filter((r): r is { zh: string; py: string } => typeof r?.zh === 'string' && typeof r?.py === 'string')
    .map(r => ({
      zh: r.zh.slice(0, MAX_RECENT_FIELD_LENGTH),
      py: r.py.slice(0, MAX_RECENT_FIELD_LENGTH),
    }))

  if (practiceMode === 'static') {
    // The client's variety-tracking sends recently-served {zh, py} pairs, not
    // sentence_bank ids — resolve them to ids here so selectStaticSentence can
    // exclude by id without the client needing to know about static-mode IDs.
    let recentIds: string[] = []
    const recentZh = recent.map(r => r.zh).filter(Boolean)
    if (recentZh.length > 0) {
      const { data: recentRows } = await supabase
        .from('sentence_bank')
        .select('id')
        .in('sentence_zh', recentZh)
      recentIds = (recentRows ?? []).map((r: { id: string }) => r.id)
    }

    let staticSentence
    try {
      staticSentence = await selectStaticSentence(supabase, user.id, { recentIds })
    } catch (err) {
      console.error('selectStaticSentence error:', err)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

    if (!staticSentence) {
      return NextResponse.json({ error: 'not_enough_static_content' }, { status: 409 })
    }

    const response: GenerateResponse = {
      sentence_id: staticSentence.id,
      sentence_zh: staticSentence.sentence_zh,
      sentence_py: staticSentence.sentence_py,
      vocab_used: staticSentence.vocab_used,
    }
    return NextResponse.json(response)
  }

  // practiceMode === 'ai'
  const apiKeyHeader = req.headers.get('X-Anthropic-Key')
  if (!apiKeyHeader) {
    return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 400 })
  }
  const anthropicClient = new Anthropic({ apiKey: apiKeyHeader })

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
    const claudeSentence = await callClaudeJson(prompt, 256, isClaudeSentence, anthropicClient)

    const { data: inserted, error: insertError } = await supabase
      .from('generated_sentences')
      .insert({
        user_id:     user.id,
        sentence_zh: claudeSentence.sentence_zh,
        sentence_py: claudeSentence.sentence_py,
        vocab_used:  claudeSentence.vocab_used,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('generated_sentences insert error:', insertError?.message)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

    const response: GenerateResponse = { ...claudeSentence, sentence_id: inserted.id }
    return NextResponse.json(response)
  } catch (err) {
    console.error('Generate error:', err)
    const status = err instanceof ClaudeResponseError ? 502 : 500
    return NextResponse.json({ error: 'Generation failed' }, { status })
  }
}
