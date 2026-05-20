import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCorpusForHsk, filterCorpus } from '@/data/hsk-corpus'
import { WordsRequest } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: WordsRequest = await req.json()
  const { pos, topic, hsk_level, exclude_zh = [], count = 5 } = body

  const [{ data: settings }, { data: existing }] = await Promise.all([
    supabase.from('settings').select('starting_hsk').eq('user_id', user.id).single(),
    supabase.from('vocab_list').select('word_zh').eq('user_id', user.id),
  ])

  const ownedZh = (existing ?? []).map(r => r.word_zh)
  const allExcluded = Array.from(new Set([...exclude_zh, ...ownedZh]))

  const maxHsk = hsk_level ?? (settings?.starting_hsk ?? 2)
  let candidates = getCorpusForHsk(maxHsk, allExcluded)
  candidates = filterCorpus(candidates, { pos, topic })
  if (candidates.length === 0) candidates = getCorpusForHsk(maxHsk, allExcluded)

  const weighted = candidates.flatMap(w => Array(7 - w.hsk).fill(w))
  const shuffled = weighted.sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const selected = shuffled.filter(w => {
    if (seen.has(w.zh)) return false
    seen.add(w.zh)
    return true
  }).slice(0, count)

  if (selected.length > 0) {
    const rows = selected.map(w => ({
      user_id: user.id,
      word_zh: w.zh, pinyin: w.py, english: w.en,
      pos: w.pos, topic: w.topic, hsk_level: w.hsk,
    }))
    const { error } = await supabase.from('vocab_list').upsert(rows, { onConflict: 'user_id,word_zh' })
    if (error) return NextResponse.json({ error: 'Failed to save words' }, { status: 500 })
  }

  return NextResponse.json({ words: selected })
}
