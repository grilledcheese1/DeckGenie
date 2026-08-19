import type { createClient } from '@/lib/supabase/server'
import type { CorpusSentence } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type StaticSentenceRow = Pick<CorpusSentence, 'id' | 'sentence_zh' | 'sentence_py' | 'vocab_used'>

interface SelectStaticSentenceOpts {
  recentIds: string[]
}

// Number of top (lowest-accuracy) candidates to randomize among, so static
// mode doesn't always serve the single "weakest word" sentence on repeat.
const TOP_POOL_SIZE = 5

// Matches this project's Supabase `max_rows` cap (supabase/config.toml) — a
// single response is silently truncated at this many rows, so the candidate
// query must paginate or it will quietly lose rows once the corpus (already
// 726 rows, ~1050 once fully seeded) exceeds this for a given hsk_level.
const PAGE_SIZE = 1000

export async function selectStaticSentence(
  supabase: SupabaseServerClient,
  userId: string,
  opts: SelectStaticSentenceOpts
): Promise<StaticSentenceRow | null> {
  const [{ data: settings }, { data: vocab, error: vocabError }] = await Promise.all([
    // Settings errors/missing rows fall back to the default HSK level below —
    // that's an intentional degraded-but-working path, not a failure to propagate.
    supabase.from('settings').select('starting_hsk').eq('user_id', userId).single(),
    supabase.from('vocab_list').select('word_zh, times_seen, times_correct').eq('user_id', userId),
  ])

  // A query failure must not be reported as "not enough content" — that tells
  // the caller to fall back to a legitimate empty state when the real problem
  // is the DB call itself.
  if (vocabError) throw new Error(`vocab_list query failed: ${vocabError.message}`)
  if (!vocab || vocab.length === 0) return null

  const maxHsk = settings?.starting_hsk ?? 2
  const ownedWords = new Set(vocab.map((w: { word_zh: string }) => w.word_zh))
  const accuracyByWord = new Map(
    vocab.map((w: { word_zh: string; times_seen: number; times_correct: number }) =>
      [w.word_zh, w.times_seen > 0 ? w.times_correct / w.times_seen : 0.5]
    )
  )

  const candidates: StaticSentenceRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: pageError } = await supabase
      .from('sentence_bank')
      .select('id, sentence_zh, sentence_py, vocab_used')
      .lte('hsk_level', maxHsk)
      .range(from, from + PAGE_SIZE - 1)
    if (pageError) throw new Error(`sentence_bank query failed: ${pageError.message}`)
    if (!page || page.length === 0) break
    candidates.push(...(page as StaticSentenceRow[]))
    if (page.length < PAGE_SIZE) break
  }

  if (candidates.length === 0) return null

  const recentSet = new Set(opts.recentIds)

  const eligible = candidates.filter(row => {
    if (recentSet.has(row.id)) return false
    // A sentence can't be served if it uses a word the user hasn't unlocked.
    return row.vocab_used.every(zh => ownedWords.has(zh))
  })

  if (eligible.length === 0) return null

  // Mirror generate/route.ts's accuracy-sort: prefer sentences whose words the
  // user is weakest on (lower average accuracy = needs more practice), then
  // pick with light randomization among the top candidates.
  const scored = eligible.map(row => {
    const accs = row.vocab_used.map(zh => accuracyByWord.get(zh) ?? 0.5)
    const avgAccuracy = accs.length > 0 ? accs.reduce((a, b) => a + b, 0) / accs.length : 0.5
    return { row, avgAccuracy }
  })
  scored.sort((a, b) => a.avgAccuracy - b.avgAccuracy)

  const topPool = scored.slice(0, Math.min(TOP_POOL_SIZE, scored.length))
  const picked = topPool[Math.floor(Math.random() * topPool.length)]

  return picked.row
}
