import type { createClient } from '@/lib/supabase/server'
import type { CorpusSentence } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface SelectStaticSentenceOpts {
  recentIds: string[]
}

// Number of top (lowest-accuracy) candidates to randomize among, so static
// mode doesn't always serve the single "weakest word" sentence on repeat.
const TOP_POOL_SIZE = 5

export async function selectStaticSentence(
  supabase: SupabaseServerClient,
  userId: string,
  opts: SelectStaticSentenceOpts
): Promise<CorpusSentence | null> {
  const [{ data: settings }, { data: vocab }] = await Promise.all([
    supabase.from('settings').select('starting_hsk').eq('user_id', userId).single(),
    supabase.from('vocab_list').select('word_zh, times_seen, times_correct').eq('user_id', userId),
  ])

  if (!vocab || vocab.length === 0) return null

  const maxHsk = settings?.starting_hsk ?? 2
  const ownedWords = new Set(vocab.map((w: { word_zh: string }) => w.word_zh))
  const accuracyByWord = new Map(
    vocab.map((w: { word_zh: string; times_seen: number; times_correct: number }) =>
      [w.word_zh, w.times_seen > 0 ? w.times_correct / w.times_seen : 0.5]
    )
  )

  const { data: candidates } = await supabase
    .from('sentence_bank')
    .select('*')
    .lte('hsk_level', maxHsk)

  if (!candidates || candidates.length === 0) return null

  const recentSet = new Set(opts.recentIds)

  const eligible = (candidates as CorpusSentence[]).filter(row => {
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
