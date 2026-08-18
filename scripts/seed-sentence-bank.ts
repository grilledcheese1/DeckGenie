// One-time offline script to bulk-populate the sentence_bank table
// (see supabase/migrations/20260817000000_add_sentence_bank_and_practice_mode.sql).
//
// Not part of the Next.js app — run via `npm run seed:sentences`, which
// invokes `tsx --env-file=.env.local` so it loads the same Anthropic/Supabase
// credentials the app itself uses, without needing Next.js's dev server.
//
// Usage:
//   npm run seed:sentences -- --dry-run --hsk=1 --count=5   # preview, no writes
//   npm run seed:sentences -- --hsk=3 --count=50            # one level
//   npm run seed:sentences                                  # all HSK 1-6, default count
//
// Flags:
//   --dry-run     print generated rows instead of inserting them
//   --hsk=N       only generate for HSK level N (1-6); omit for all levels
//   --count=N     sentences per level (default 175, i.e. within the 150-200 target)

import { getCorpusForHsk } from '../src/data/hsk-corpus'
import { anthropic, ClaudeResponseError } from '../src/lib/llm'
import { createClient } from '@supabase/supabase-js'
import type { CorpusWord, CorpusSentence } from '../src/types'

const MODEL = 'claude-sonnet-4-6'
const DEFAULT_COUNT_PER_LEVEL = 175
const BATCH_SIZE = 25
const DELAY_MS = 300 // light courtesy delay between Claude calls

type SentenceBankInsert = Omit<CorpusSentence, 'id' | 'created_at'>

interface SeedSentence {
  sentence_zh: string
  sentence_py: string
  canonical_en: string
  vocab_used: string[]
}

function isSeedSentence(value: unknown): value is SeedSentence {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.sentence_zh === 'string'
    && typeof v.sentence_py === 'string'
    && typeof v.canonical_en === 'string'
    && Array.isArray(v.vocab_used)
    && v.vocab_used.every(w => typeof w === 'string')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const hskArg = args.find(a => a.startsWith('--hsk='))
  const hskLevel = hskArg ? Number(hskArg.split('=')[1]) : undefined
  if (hskLevel !== undefined && (!Number.isInteger(hskLevel) || hskLevel < 1 || hskLevel > 6)) {
    throw new Error(`--hsk must be an integer 1-6, got "${hskArg}"`)
  }

  const countArg = args.find(a => a.startsWith('--count='))
  const count = countArg ? Number(countArg.split('=')[1]) : DEFAULT_COUNT_PER_LEVEL
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--count must be a positive integer, got "${countArg}"`)
  }

  return { dryRun, hskLevel, count }
}

// Same prompt structure/rules as src/app/api/generate/route.ts, adapted for
// a static corpus seed rather than a single logged-in user's session:
//  - no times_seen/times_correct sorting (there's no per-user practice
//    history here) — the vocab pool is shuffled per request instead, so
//    repeated calls don't always favor the same handful of words
//  - adds canonical_en to the requested JSON shape, since sentence_bank
//    needs a stored reference translation (the AI-generated flow grades
//    live via Claude instead, so it never needed this field)
function buildPrompt(pool: CorpusWord[], recent: Array<{ zh: string; py: string }>): string {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const vocabCsv = shuffled.map(w => `${w.zh},${w.py},${w.en},${w.pos}`).join('\n')

  const varietyBlock = recent.length > 0
    ? `\nRECENT SENTENCES (do NOT reuse similar structure or phrasing):\n${
        recent.map((s, i) => `${i + 1}. ${s.zh}  [${s.py}]`).join('\n')
      }\n\nVARIETY RULES — the new sentence MUST differ from ALL recent sentences in at least 2 of these dimensions:\n1. Sentence type: declarative | 吗-question | 呢/吧-tag question | imperative | 如果…就… conditional\n2. Subject: pronoun (我/你/他) | proper noun | bare noun | noun phrase | topic-dropped\n3. Predicate: action verb | stative/psychological verb | adjective predicate | noun predicate\n4. Aspect/tense: none (habitual) | 了 completed | 过 experienced | 在/正在 ongoing | 要/想 intent\n5. Clause count: single clause | compound (因为/所以/但是/虽然/而且)\n6. Object: none | bare noun | 的-phrase modified noun\n`
    : ''

  return `You are a Chinese language tutor. Generate ONE natural Mandarin sentence for a student to translate into English.

RULES:
- Use ONLY words from the vocabulary list below (plus essential grammar particles: 的,了,吗,呢,吧,也,都,很,太,比,和,还,就,才,又,再,最,非常,因为,所以,但是,虽然)
- Sentence must be grammatically correct
- Difficulty: short to medium length (6–14 characters)
${varietyBlock}
VOCABULARY (zh,pinyin,english,pos):
${vocabCsv}

Respond with ONLY valid JSON, no markdown:
{"sentence_zh":"...","sentence_py":"...","canonical_en":"...","vocab_used":["zh_word1","zh_word2"]}

canonical_en must be a natural, idiomatic English translation — this is the stored reference answer, so prefer clarity over literal word-for-word phrasing.`
}

async function generateOne(pool: CorpusWord[], recent: Array<{ zh: string; py: string }>): Promise<SeedSentence> {
  const prompt = buildPrompt(pool, recent)
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new ClaudeResponseError(`Expected a text content block, got "${block.type}"`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(block.text.trim())
  } catch (err) {
    throw new ClaudeResponseError('Claude response was not valid JSON', err)
  }

  if (!isSeedSentence(parsed)) {
    throw new ClaudeResponseError('Claude response did not match the expected shape', parsed)
  }

  return parsed
}

// sentence_bank stores one pos/topic per sentence row, but vocab words each
// carry their own pos/topic — take the most common value among the words
// the sentence actually used (falls back to null if none matched the pool,
// which shouldn't happen since the prompt restricts Claude to pool words).
function mode<T>(items: T[]): T | null {
  if (items.length === 0) return null
  const counts = new Map<T, number>()
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function deriveRowMeta(vocabUsed: string[], pool: CorpusWord[]): { pos: string | null; topic: string | null } {
  const matched = vocabUsed
    .map(zh => pool.find(w => w.zh === zh))
    .filter((w): w is CorpusWord => !!w)
  return {
    pos: mode(matched.map(w => w.pos)),
    topic: mode(matched.map(w => w.topic)),
  }
}

let supabaseAdmin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (check .env.local)')
  }
  supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  return supabaseAdmin
}

async function flush(rows: SentenceBankInsert[], dryRun: boolean) {
  if (rows.length === 0) return
  if (dryRun) {
    console.log(`  [dry-run] would insert ${rows.length} row(s):`)
    for (const row of rows) console.log('   ', JSON.stringify(row))
    return
  }
  // No generated Database type exists in this project (the app's own Supabase
  // clients are untyped too), so `.insert()` can't infer a row type here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await getSupabaseAdmin().from('sentence_bank').insert(rows as any)
  if (error) throw new Error(`Insert failed: ${error.message}`)
  console.log(`  inserted ${rows.length} row(s)`)
}

async function main() {
  const { dryRun, hskLevel, count } = parseArgs()
  const levels = hskLevel ? [hskLevel] : [1, 2, 3, 4, 5, 6]

  console.log(`Target Supabase project: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will insert into sentence_bank)'}`)
  console.log(`Levels: ${levels.join(', ')} · count per level: ${count}\n`)

  let totalGenerated = 0
  let totalGenerationFailed = 0
  let totalInserted = 0
  let totalInsertFailed = 0

  // Flushes and always clears the buffer, win or lose, so a bad batch can
  // never re-accumulate into every later flush attempt for the rest of the run.
  async function flushBuffer(buffer: SentenceBankInsert[]): Promise<SentenceBankInsert[]> {
    if (buffer.length === 0) return buffer
    const toFlush = buffer
    try {
      await flush(toFlush, dryRun)
      totalInserted += toFlush.length
    } catch (err) {
      totalInsertFailed += toFlush.length
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`  batch flush failed, ${toFlush.length} row(s) lost: ${message}`)
    }
    return []
  }

  for (const level of levels) {
    const pool = getCorpusForHsk(level)
    if (pool.length < 5) {
      console.warn(`[HSK${level}] skipping — only ${pool.length} words in corpus for this level`)
      continue
    }

    console.log(`[HSK${level}] generating ${count} sentences from a ${pool.length}-word pool...`)
    const recent: Array<{ zh: string; py: string }> = []
    let buffer: SentenceBankInsert[] = []

    for (let i = 0; i < count; i++) {
      try {
        const sentence = await generateOne(pool, recent)
        recent.unshift({ zh: sentence.sentence_zh, py: sentence.sentence_py })
        if (recent.length > 5) recent.length = 5

        const { pos, topic } = deriveRowMeta(sentence.vocab_used, pool)
        buffer.push({
          sentence_zh: sentence.sentence_zh,
          sentence_py: sentence.sentence_py,
          canonical_en: sentence.canonical_en,
          vocab_used: sentence.vocab_used,
          hsk_level: level as CorpusSentence['hsk_level'],
          pos,
          topic,
        })
        totalGenerated++
        console.log(`  [${i + 1}/${count}] ${sentence.sentence_zh}  (${sentence.canonical_en})`)

        if (buffer.length >= BATCH_SIZE) {
          buffer = await flushBuffer(buffer)
        }
      } catch (err) {
        totalGenerationFailed++
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`  [${i + 1}/${count}] generation failed, skipping: ${message}`)
      }

      await sleep(DELAY_MS)
    }

    buffer = await flushBuffer(buffer)
  }

  const insertedLabel = dryRun ? 'Would have inserted' : 'Inserted'
  console.log(
    `\nDone. Generated ${totalGenerated} (${totalGenerationFailed} generation failures). `
    + `${insertedLabel} ${totalInserted}, ${totalInsertFailed} lost to insert failures.`
  )
}

main().catch(err => {
  console.error('Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
