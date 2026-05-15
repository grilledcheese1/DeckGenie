'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VocabWord } from '@/types'

const PAGE_SIZE = 50

interface Filters {
  hsk: number | null
  pos: string | null
  topic: string | null
  search: string
}

export function useVocabSheet() {
  const supabase = createClient()
  const [words, setWords]       = useState<VocabWord[]>([])
  const [loading, setLoading]   = useState(false)
  const [hasMore, setHasMore]   = useState(true)
  const [filters, setFilters]   = useState<Filters>({ hsk: null, pos: null, topic: null, search: '' })
  const offsetRef               = useRef(0)

  const fetchWords = useCallback(async (reset: boolean, f: Filters) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const offset = reset ? 0 : offsetRef.current

    let query = supabase
      .from('vocab_list')
      .select('*')
      .eq('user_id', user.id)
      .order('hsk_level', { ascending: true })
      .order('unlocked_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (f.hsk)    query = query.eq('hsk_level', f.hsk)
    if (f.pos)    query = query.eq('pos', f.pos)
    if (f.topic)  query = query.eq('topic', f.topic)
    if (f.search) query = query.or(
      `word_zh.ilike.%${f.search}%,pinyin.ilike.%${f.search}%,english.ilike.%${f.search}%`
    )

    const { data } = await query
    const rows = data ?? []

    if (reset) {
      setWords(rows)
      offsetRef.current = rows.length
    } else {
      setWords(prev => [...prev, ...rows])
      offsetRef.current = offset + rows.length
    }

    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }, [supabase])

  const open = useCallback((f = filters) => {
    offsetRef.current = 0
    fetchWords(true, f)
  }, [fetchWords, filters])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchWords(false, filters)
  }, [loading, hasMore, filters, fetchWords])

  const applyFilter = useCallback((patch: Partial<Filters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    offsetRef.current = 0
    fetchWords(true, next)
  }, [filters, fetchWords])

  const removeWord = useCallback(async (id: string) => {
    // Optimistic remove
    setWords(prev => prev.filter(w => w.id !== id))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('vocab_list').delete().eq('id', id).eq('user_id', user.id)
  }, [supabase])

  return { words, loading, hasMore, filters, open, loadMore, applyFilter, removeWord }
}
