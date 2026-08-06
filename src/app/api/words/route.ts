import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { getCorpusForHsk, filterCorpus } from '@/data/hsk-corpus'
import { WordsRequest } from '@/types'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body: WordsRequest = await req.json()
  const { pos, topic, hsk_level: rawHskLevel, exclude_zh = [], count: rawCount = 5 } = body

  const count = Math.min(Math.max(1, rawCount), 20)
  const hsk_level = rawHskLevel !== undefined
    ? Math.min(Math.max(1, rawHskLevel), 6)
    : undefined

  const [{ data: settings }, { data: existing, error: existingError }, { data: progress }] = await Promise.all([
    supabase.from('settings').select('starting_hsk, rounds_before_unlock').eq('user_id', user.id).single(),
    supabase.from('vocab_list').select('word_zh').eq('user_id', user.id),
    supabase.from('progress').select('rounds_completed, last_claimed_round').eq('user_id', user.id).single(),
  ])

  if (existingError) return NextResponse.json({ error: 'Failed to read vocabulary' }, { status: 500 })

  const isFirstRun = (existing ?? []).length === 0

  if (!isFirstRun) {
    const roundsCompleted = progress?.rounds_completed ?? 0
    const lastClaimedRound = progress?.last_claimed_round ?? 0
    const roundsBeforeUnlock = settings?.rounds_before_unlock ?? 3
    const entitled = roundsCompleted > 0
      && roundsCompleted % roundsBeforeUnlock === 0
      && roundsCompleted > lastClaimedRound

    if (!entitled) {
      return NextResponse.json({ error: 'No unlock available' }, { status: 403 })
    }
  }

  const ownedZh = (existing ?? []).map(r => r.word_zh)
  const allExcluded = Array.from(new Set([...exclude_zh, ...ownedZh]))

  const maxHsk = hsk_level ?? (settings?.starting_hsk ?? 2)
  const base = getCorpusForHsk(maxHsk, allExcluded)
  let candidates = filterCorpus(base, { pos, topic })
  if (candidates.length === 0) candidates = filterCorpus(base, { pos })
  if (candidates.length === 0) candidates = filterCorpus(base, { topic })
  if (candidates.length === 0) candidates = base

  const weighted = candidates.flatMap(w => Array(7 - w.hsk).fill(w))
  const shuffled = weighted.sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const selected = shuffled.filter(w => {
    if (seen.has(w.zh)) return false
    seen.add(w.zh)
    return true
  }).slice(0, count)

  if (selected.length > 0) {
    // Atomically re-verify entitlement and bump last_claimed_round (row-locked
    // in the DB) before granting anything — the check above is for a clean
    // error response, this is what actually prevents a double-submit race
    // from claiming the same unlock twice.
    const { error: claimError } = await supabase.rpc('claim_word_unlock')
    if (claimError) {
      return NextResponse.json({ error: 'No unlock available' }, { status: 403 })
    }

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
