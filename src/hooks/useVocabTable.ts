'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VocabWord } from '@/types'

const PAGE_SIZE = 8

export type SortOrder = 'newest' | 'oldest'
export type FavoriteWord = Pick<VocabWord, 'id' | 'word_zh' | 'pinyin' | 'english'>

interface QueryState {
  page: number
  hsk: number | null
  pos: string | null
  search: string
  sort: SortOrder
}

const INITIAL_QUERY: QueryState = { page: 1, hsk: null, pos: null, search: '', sort: 'newest' }

/**
 * Dedicated data hook for the standalone /vocabulary page's data table —
 * real 8-per-page Supabase pagination (not the infinite-scroll pattern
 * `useVocabSheet` uses for the dashboard's overlay sheet, which this hook
 * does not touch). Also owns the favorites list, which is independent of
 * the table's filters/pagination — a favorited word stays visible in the
 * favorites card/panel even if the table's current filters would exclude
 * it — and word deletion.
 */
export function useVocabTable() {
  const supabase = createClient()

  const [query, setQuery] = useState<QueryState>(INITIAL_QUERY)
  const [searchInput, setSearchInputState] = useState('')

  const [words, setWords]           = useState<VocabWord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [favorites, setFavorites] = useState<FavoriteWord[]>([])

  const requestIdRef = useRef(0)

  // Debounce raw search input into the query (300ms) -- and only reset to
  // page 1 when it actually changes the result set, so typing then
  // deleting back to the same text doesn't reset pagination.
  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery(q => q.search === searchInput ? q : { ...q, search: searchInput, page: 1 })
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const fetchPage = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      if (requestId === requestIdRef.current) {
        setWords([])
        setTotalCount(0)
        setLoading(false)
      }
      return
    }

    let dbQuery = supabase
      .from('vocab_list')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: query.sort === 'oldest' })

    if (query.hsk)    dbQuery = dbQuery.eq('hsk_level', query.hsk)
    if (query.pos)    dbQuery = dbQuery.eq('pos', query.pos)

    // `query.search` is raw user input going into PostgREST's filter-string
    // DSL: "," and "(" / ")" are the or-list separator and grouping syntax
    // there, and "%" / "_" are ILIKE wildcards -- left unescaped, a search
    // like "cat, dog" or "100%" would corrupt the filter or match more than
    // the user typed. Strip the DSL syntax chars and backslash-escape the
    // ILIKE wildcards so the search text is always matched literally. Do
    // not simplify this back to raw interpolation.
    const sanitizedSearch = query.search.replace(/[,()]/g, '').replace(/[%_]/g, '\\$&')
    if (sanitizedSearch) dbQuery = dbQuery.or(
      `word_zh.ilike.%${sanitizedSearch}%,pinyin.ilike.%${sanitizedSearch}%,english.ilike.%${sanitizedSearch}%`
    )

    const from = (query.page - 1) * PAGE_SIZE
    const { data, count, error: queryError } = await dbQuery.range(from, from + PAGE_SIZE - 1)

    if (requestId !== requestIdRef.current) return

    if (queryError) {
      console.error('useVocabTable: failed to load vocab_list:', queryError.message)
      setError(queryError.message)
      setLoading(false)
      return
    }

    setWords(data ?? [])
    setTotalCount(count ?? 0)
    setError(null)
    setLoading(false)
  }, [supabase, query])

  useEffect(() => { fetchPage() }, [fetchPage])

  const fetchFavorites = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { setFavorites([]); return }
    const { data, error: favError } = await supabase
      .from('vocab_list')
      .select('id, word_zh, pinyin, english')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('unlocked_at', { ascending: false })
    if (favError) {
      console.error('useVocabTable: failed to load favorites:', favError.message)
      return
    }
    setFavorites(data ?? [])
  }, [supabase])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  // Toggles favorite status from the table (has the full VocabWord, so it
  // can rebuild a FavoriteWord entry if `next` is adding it).
  const setFavorite = useCallback(async (word: VocabWord, next: boolean) => {
    setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_favorite: next } : w))
    setFavorites(prev => next
      ? (prev.some(f => f.id === word.id)
          ? prev
          : [{ id: word.id, word_zh: word.word_zh, pinyin: word.pinyin, english: word.english }, ...prev])
      : prev.filter(f => f.id !== word.id)
    )

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (user) {
      const { error: updateError } = await supabase
        .from('vocab_list')
        .update({ is_favorite: next })
        .eq('id', word.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('useVocabTable: failed to toggle favorite:', updateError.message)
        setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_favorite: !next } : w))
        setFavorites(prev => !next
          ? (prev.some(f => f.id === word.id)
              ? prev
              : [{ id: word.id, word_zh: word.word_zh, pinyin: word.pinyin, english: word.english }, ...prev])
          : prev.filter(f => f.id !== word.id)
        )
      }
    }
  }, [supabase])

  // Unfavorites from the expanded panel, where only a FavoriteWord (not a
  // full VocabWord) is available -- always removing, never re-adding, so
  // it doesn't need the extra fields setFavorite's "re-add" branch needs.
  const unfavorite = useCallback(async (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_favorite: false } : w))

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (user) {
      const { error: updateError } = await supabase
        .from('vocab_list')
        .update({ is_favorite: false })
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('useVocabTable: failed to unfavorite:', updateError.message)
        fetchFavorites()
      }
    }
  }, [supabase, fetchFavorites])

  const deleteWord = useCallback(async (id: string) => {
    const wasOnlyItemOnPage = words.length === 1
    setWords(prev => prev.filter(w => w.id !== id))
    setTotalCount(prev => Math.max(0, prev - 1))
    setFavorites(prev => prev.filter(f => f.id !== id))

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (user) {
      const { error: deleteError } = await supabase
        .from('vocab_list')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (deleteError) {
        console.error('useVocabTable: failed to delete word:', deleteError.message)
      }
    }

    if (wasOnlyItemOnPage && query.page > 1) {
      setQuery(q => ({ ...q, page: q.page - 1 }))
    }
  }, [supabase, words.length, query.page])

  return {
    words, totalCount, totalPages, loading, error,
    page: query.page,
    setPage: (p: number) => setQuery(q => ({ ...q, page: p })),
    hsk: query.hsk,
    setHsk: (v: number | null) => setQuery(q => ({ ...q, hsk: v, page: 1 })),
    pos: query.pos,
    setPos: (v: string | null) => setQuery(q => ({ ...q, pos: v, page: 1 })),
    searchInput,
    setSearchInput: setSearchInputState,
    sort: query.sort,
    setSort: (v: SortOrder) => setQuery(q => ({ ...q, sort: v, page: 1 })),
    favorites,
    setFavorite,
    unfavorite,
    deleteWord,
  }
}
