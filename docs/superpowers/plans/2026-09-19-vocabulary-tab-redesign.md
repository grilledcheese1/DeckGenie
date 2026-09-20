# Vocabulary Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the standalone `/vocabulary` page's content area to match `public/vocab_tab_refactor.png` — stat cards, rich filters, a real paginated data table, a favorites feature with an expandable list panel, and a delete-with-confirm row action — without touching the dashboard's existing `VocabBrowser`/`VocabSheet` overlay.

**Architecture:** One new dedicated hook (`useVocabTable`) owns real Supabase-paginated fetching, filters/sort, favorites, and delete for this page only. Ten small new presentational components compose the page; none of them are shared with (or modify) the existing vocab-overlay stack. Full details and rationale: `docs/superpowers/specs/2026-09-19-vocabulary-tab-redesign-design.md`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (`@supabase/ssr`/`supabase-js`), Tailwind v4, GSAP.

**Note on verification steps:** this repo has no automated test framework (no `test` script, no Jest/Vitest) — confirmed during exploration. Every task's verification step is therefore `npm run build` (TypeScript catches wiring/type errors across these files) instead of a unit test, plus a manual click-through checklist in the final task, matching how prior work in this repo has been verified.

---

## Before you start

Read `docs/superpowers/specs/2026-09-19-vocabulary-tab-redesign-design.md` in full — it has the "why" behind every decision below (brainstormed with the user, including two rounds of visual mockups). This plan is the "what/how."

**Apply the migration from Task 1 to your Supabase project before Task 4 (favorites) will work end-to-end** — `supabase db push` or paste the SQL into the Supabase dashboard's SQL editor. Everything up through Task 3 works without it.

---

### Task 1: Data model — favorites column + type fixes

**Files:**
- Create: `supabase/migrations/20260919000000_add_vocab_favorites.sql`
- Modify: `src/types/index.ts:16-28`

- [ ] **Step 1: Write the migration**

```sql
-- Adds a lightweight "favorite" bookmark to vocab_list so users can star
-- words from the /vocabulary page's redesigned table (see
-- docs/superpowers/specs/2026-09-19-vocabulary-tab-redesign-design.md).
-- Bookmark only -- does not affect /api/generate's word selection.
ALTER TABLE public.vocab_list
  ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Partial index: the favorites-panel query filters on is_favorite = true,
-- and the large majority of any user's rows will be false.
CREATE INDEX vocab_list_user_favorite_idx
  ON public.vocab_list (user_id, is_favorite)
  WHERE is_favorite;
```

No new RLS policy needed — `vocab_update`/`users can update own vocab` (existing, `auth.uid() = user_id`) already covers writes to this new column.

- [ ] **Step 2: Update the `VocabWord` type**

Current (`src/types/index.ts:16-28`):

```ts
export interface VocabWord {
  id: string
  user_id: string
  word_zh: string
  pinyin: string
  english: string
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
  topic: string
  hsk_level: 1 | 2 | 3 | 4 | 5 | 6
  unlocked_at: string
  times_seen: number
  times_correct: number
}
```

Replace with:

```ts
export interface VocabWord {
  id: string
  user_id: string
  word_zh: string
  pinyin: string
  english: string
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other'
  topic: string
  hsk_level: 1 | 2 | 3 | 4 | 5 | 6
  unlocked_at: string
  times_seen: number
  times_correct: number
  /** Server-maintained by the `record_word_attempt` RPC after every graded
   *  attempt (see `/api/grade/route.ts`) — this column has existed in the
   *  DB since migration `20260806023645_remote_schema.sql`, it was just
   *  never added to this type until now. */
  mastery_level: 'learning' | 'reviewing' | 'mastered'
  is_favorite: boolean
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds (this is a pure additive type change — no existing code destructures these two new fields, so nothing can break).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260919000000_add_vocab_favorites.sql src/types/index.ts
git commit -m "Add is_favorite column and fix VocabWord type gap

New migration adds vocab_list.is_favorite for the /vocabulary page's
favorites feature. Also adds mastery_level to the VocabWord type -- the
column already existed in the DB (set by record_word_attempt) but was
never reflected in this type.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 2: `Card` — add ref forwarding

`FavoritesCard` (Task 6) needs to expose its DOM node so `FavoritesExpandedPanel` (Task 7) can anchor to it. `Card` is a plain function component today and can't take a ref.

**Files:**
- Modify: `src/components/ui/Card.tsx` (whole file)

- [ ] **Step 1: Rewrite `Card.tsx` with `forwardRef`**

```tsx
import { forwardRef } from 'react'

export type CardPadding = 'sm' | 'md' | 'lg' | 'xl'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-8',
}

/**
 * The `rounded-2xl` / `var(--bg-secondary)` / `var(--border)` container
 * pattern repeated across dashboard, summary, and review cards.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', className = '', style, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl ${PADDING_CLASSES[padding]} ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', ...style }}
      {...rest}
    >
      {children}
    </div>
  )
})
```

This is purely additive — every existing `<Card>` usage (dashboard, progress, summary screens) passes no `ref`, so nothing about their behavior changes.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "Card: add ref forwarding

Needed so FavoritesCard (vocabulary tab redesign) can expose its DOM
node for the expandable favorites panel to anchor to. Purely additive
-- no existing <Card> usage passes a ref today.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 3: New icon set for the vocabulary page

**Files:**
- Create: `src/components/vocab/icons.tsx`

- [ ] **Step 1: Write the icons**

```tsx
import type { SVGProps } from 'react'

/** Small icon set for the redesigned /vocabulary page — app convention:
 *  viewBox 0 0 24 24, stroke=currentColor, strokeWidth ~1.8, round caps
 *  (see e.g. src/components/ui/StatIcons.tsx). */
function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

const STAR_PATH = 'm12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8-4.3-4.1 5.9-.9L12 3Z'

export function StarIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d={STAR_PATH} />
    </svg>
  )
}

export function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Small sprout/leaf glyph for the "Small steps · Big progress" wordmark
 *  — same shape dashboard/page.tsx's local LeafIcon uses, duplicated here
 *  rather than imported (this codebase's existing convention: small icons
 *  are defined per-file, not centralized). */
export function LeafGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 21c8 0 14-6 14-14V5h-2C9 5 5 11 5 19v2Z" />
      <path d="M5 21c2.5-4 6-7 10.5-9" />
    </svg>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/icons.tsx
git commit -m "Add icon set for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 4: `useVocabTable` hook

**Files:**
- Create: `src/hooks/useVocabTable.ts`

This is the data layer for the whole page: real pagination, filters/sort, favorites (independent of pagination), and delete. It does not import or modify `useVocabSheet.ts`.

- [ ] **Step 1: Write the hook**

```ts
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
    if (query.search) dbQuery = dbQuery.or(
      `word_zh.ilike.%${query.search}%,pinyin.ilike.%${query.search}%,english.ilike.%${query.search}%`
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

    const { error: updateError } = await supabase
      .from('vocab_list')
      .update({ is_favorite: next })
      .eq('id', word.id)

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
  }, [supabase])

  // Unfavorites from the expanded panel, where only a FavoriteWord (not a
  // full VocabWord) is available -- always removing, never re-adding, so
  // it doesn't need the extra fields setFavorite's "re-add" branch needs.
  const unfavorite = useCallback(async (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_favorite: false } : w))

    const { error: updateError } = await supabase
      .from('vocab_list')
      .update({ is_favorite: false })
      .eq('id', id)

    if (updateError) {
      console.error('useVocabTable: failed to unfavorite:', updateError.message)
      fetchFavorites()
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
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds. (Not imported anywhere yet — that's fine, it's a standalone valid module until Task 12 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVocabTable.ts
git commit -m "Add useVocabTable hook for the vocabulary page redesign

Real paginated Supabase fetching (8/page), filters/sort, an
independent favorites list, and delete -- dedicated to the standalone
/vocabulary page, not touching useVocabSheet (dashboard overlay).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 5: `VocabPageHeader`

**Files:**
- Create: `src/components/vocab/VocabPageHeader.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { LeafGlyph } from './icons'
import type { Settings } from '@/types'

interface Props {
  vocabCount: number
  hskLevel: Settings['starting_hsk'] | undefined
}

/**
 * Title + subtitle, the read-only HSK chip (deliberately no chevron/select
 * affordance -- see Decision 5 in the design doc, this is display-only),
 * and the "Small steps · Big progress" wordmark from the mockup.
 */
export function VocabPageHeader({ vocabCount, hskLevel }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Vocabulary</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Build, search, and manage your Chinese vocabulary.
        </p>
      </div>

      <div className="flex items-start gap-6 flex-shrink-0">
        <div className="text-right">
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            HSK {hskLevel ?? 1}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{vocabCount} words active</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <p
            className="text-[10px] font-semibold uppercase leading-tight text-right"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
          >
            Small steps<br />Big progress
          </p>
          <LeafGlyph width={20} height={20} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabPageHeader.tsx
git commit -m "Add VocabPageHeader for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 6: `FavoritesCard`

**Files:**
- Create: `src/components/vocab/FavoritesCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { forwardRef } from 'react'
import { Card } from '@/components/ui/Card'
import { StarIcon } from './icons'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  favorites: FavoriteWord[]
  onExpand: () => void
}

/**
 * Replaces the plain "12 Favorites" stat count with a live preview of the
 * top 3 favorited words, plus a "+N more" link that opens
 * `FavoritesExpandedPanel`. Forwards its ref so that panel can anchor
 * itself to this card's on-screen position.
 */
export const FavoritesCard = forwardRef<HTMLDivElement, Props>(function FavoritesCard(
  { favorites, onExpand },
  ref
) {
  const preview = favorites.slice(0, 3)
  const remaining = favorites.length - preview.length

  return (
    <Card
      ref={ref}
      padding="lg"
      className="cursor-pointer transition-colors hover-border"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
        >
          <StarIcon filled width={18} height={18} />
        </div>
        <div>
          <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{favorites.length}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Favorites</p>
        </div>
      </div>

      {preview.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No favorites yet — star a word below.</p>
      ) : (
        <div>
          {preview.map(word => (
            <div
              key={word.id}
              className="flex items-baseline justify-between py-1 gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="min-w-0 truncate">
                <span className="font-hanzi text-sm mr-2" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>
                <span className="text-xs" style={{ color: 'var(--accent-text)' }}>{word.pinyin}</span>
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{word.english}</span>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-xs text-center mt-1.5" style={{ color: 'var(--accent-text)' }}>
              +{remaining} more · Show all →
            </p>
          )}
        </div>
      )}
    </Card>
  )
})
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/FavoritesCard.tsx
git commit -m "Add FavoritesCard for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 7: `FavoritesExpandedPanel`

**Files:**
- Create: `src/components/vocab/FavoritesExpandedPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from 'gsap'
import { StarIcon } from './icons'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  favorites: FavoriteWord[]
  anchorRef: RefObject<HTMLDivElement | null>
  onUnfavorite: (id: string) => void
  onClose: () => void
}

/**
 * The "expand that column" view -- grows anchored at the favorites card's
 * own top-right corner (measured via `anchorRef`, not a centered dialog),
 * over a dimmed + blurred backdrop matching `UnlockModal`'s convention.
 * Caps its own height and scrolls internally once favorites overflow it.
 */
export function FavoritesExpandedPanel({ favorites, anchorRef, onUnfavorite, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    function measure() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!panelRef.current || !pos) return
    gsap.fromTo(panelRef.current,
      { opacity: 0, scale: 0.95, y: -8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' }
    )
  }, [pos])

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {pos && (
        <div
          ref={panelRef}
          className="fixed z-50 w-80 max-h-[70vh] flex flex-col rounded-2xl p-4"
          style={{
            top: pos.top,
            right: pos.right,
            transformOrigin: 'top right',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-hover)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              All Favorites ({favorites.length})
            </p>
            <button
              onClick={onClose}
              className="text-lg leading-none"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto space-y-0.5">
            {favorites.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No favorites yet.</p>
            )}
            {favorites.map(word => (
              <div
                key={word.id}
                className="flex items-center justify-between py-1.5 gap-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="min-w-0 truncate">
                  <span className="font-hanzi text-base mr-2" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>
                  <span className="text-xs" style={{ color: 'var(--accent-text)' }}>{word.pinyin}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{word.english}</span>
                </span>
                <button
                  onClick={() => onUnfavorite(word.id)}
                  aria-label={`Unfavorite ${word.word_zh}`}
                  className="flex-shrink-0"
                  style={{ color: '#fbbf24' }}
                >
                  <StarIcon filled width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/FavoritesExpandedPanel.tsx
git commit -m "Add FavoritesExpandedPanel for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 8: `VocabFilterBar`

**Files:**
- Create: `src/components/vocab/VocabFilterBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { ChevronDownIcon } from '@/components/progress/progressIcons'
import { SearchIcon } from './icons'
import type { SortOrder } from '@/hooks/useVocabTable'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6]
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'other']

interface Props {
  hsk: number | null
  onHskChange: (v: number | null) => void
  pos: string | null
  onPosChange: (v: string | null) => void
  searchInput: string
  onSearchInputChange: (v: string) => void
  sort: SortOrder
  onSortChange: (v: SortOrder) => void
}

export function VocabFilterBar({
  hsk, onHskChange, pos, onPosChange,
  searchInput, onSearchInputChange,
  sort, onSortChange,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  // The "⌘K" hint is real -- global shortcut focuses the search input.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const selectedPill: React.CSSProperties = {
    backgroundColor: 'var(--accent-subtle)',
    border: '1px solid var(--accent)',
    color: 'var(--accent-text)',
  }
  const unselectedPill: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-tertiary)',
  }

  return (
    <div className="mb-4">
      <div className="relative mb-3">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <SearchIcon width={15} height={15} />
        </span>
        <input
          ref={searchRef}
          type="text"
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          placeholder="Search characters, pinyin, meanings, or English…"
          className="w-full rounded-xl pl-11 pr-16 py-3 text-sm focus:outline-none transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
        >
          ⌘ K
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>HSK Level</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onHskChange(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={hsk === null ? selectedPill : unselectedPill}
              >
                All HSK
              </button>
              {HSK_LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => onHskChange(hsk === l ? null : l)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={hsk === l ? selectedPill : unselectedPill}
                >
                  HSK {l}
                </button>
              ))}
            </div>
          </div>

          <div className="pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Word Type</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onPosChange(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={pos === null ? selectedPill : unselectedPill}
              >
                All types
              </button>
              {POS_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => onPosChange(pos === p ? null : p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                  style={pos === p ? selectedPill : unselectedPill}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative inline-flex items-center flex-shrink-0">
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value as SortOrder)}
            aria-label="Sort order"
            className="appearance-none rounded-xl py-2 pl-3 pr-8 text-xs font-medium transition-colors hover-border"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
          <span className="pointer-events-none absolute right-2.5" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronDownIcon width={12} height={12} />
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabFilterBar.tsx
git commit -m "Add VocabFilterBar for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 9: `VocabRowMenu`

**Files:**
- Create: `src/components/vocab/VocabRowMenu.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { VocabWord } from '@/types'

interface Props {
  word: VocabWord
  onDelete: () => void
  onClose: () => void
}

const GAP = 6
const EDGE = 8

/**
 * The "•••" row menu -- mirrors CharTooltip.tsx's anchor/flip/GSAP
 * convention (practice's analysis-mode character tooltip): a small
 * popover, positioned relative to its `position: relative` parent cell,
 * flipping above the anchor when there isn't room below. Two internal
 * steps: "menu" (Delete word) -> "confirm" (Delete X? Cancel/Delete).
 */
export function VocabRowMenu({ word, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom')
  const [step, setStep] = useState<'menu' | 'confirm'>('menu')

  useLayoutEffect(() => {
    const el = ref.current
    const anchor = el?.parentElement
    if (!el || !anchor) return
    const rect = anchor.getBoundingClientRect()
    const spaceAbove = rect.top - GAP - EDGE
    const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE
    setPlacement(spaceBelow >= el.offsetHeight || spaceBelow > spaceAbove ? 'bottom' : 'top')
  }, [step])

  useLayoutEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' }
    )
  }, [placement, step])

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); onClose() }} />
      <div
        ref={ref}
        className="absolute z-40 text-left"
        style={{
          ...(placement === 'top' ? { bottom: `calc(100% + ${GAP}px)` } : { top: `calc(100% + ${GAP}px)` }),
          right: 0,
          width: step === 'confirm' ? '200px' : '140px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="rounded-xl p-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-hover)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {step === 'menu' ? (
            <button
              onClick={() => setStep('confirm')}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover-bg"
              style={{ color: '#ef4444' }}
            >
              Delete word
            </button>
          ) : (
            <div className="px-1 py-1">
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                Delete <span className="font-hanzi" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</span>?
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={onClose}
                  className="flex-1 text-xs font-medium rounded-lg py-1.5 transition-colors hover-bg"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 text-xs font-medium rounded-lg py-1.5 transition-colors"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabRowMenu.tsx
git commit -m "Add VocabRowMenu (delete-with-confirm) for the vocabulary page

Mirrors CharTooltip.tsx's anchor/flip/GSAP popover convention from
practice's analysis mode, per user request.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 10: `VocabTable`

**Files:**
- Create: `src/components/vocab/VocabTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import type { VocabWord } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { StarIcon, MoreIcon } from './icons'
import { VocabRowMenu } from './VocabRowMenu'

// Local to this page -- Badge.tsx's shared POS_STYLE stays neutral so the
// practice page's analysis table doesn't change appearance (see design
// doc Scope). Noun/Other reuse existing theme tokens; Adjective/Verb/
// Adverb are new hardcoded colors, following the same precedent
// Badge.tsx's STATUS_STYLES already sets for non-theme-flipping colors.
const POS_COLORS: Record<string, React.CSSProperties> = {
  adjective: { color: '#60a5fa', backgroundColor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' },
  verb:      { color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' },
  adverb:    { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' },
  noun:      { color: 'var(--accent-text)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent)' },
  other:     { color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' },
}

interface StatusInfo { label: string; color: string }

// Derived from the real, server-maintained mastery_level column (set by
// the record_word_attempt RPC), not a client-side accuracy heuristic --
// see Decision 4 in the design doc.
function statusFor(word: VocabWord): StatusInfo {
  if (word.mastery_level === 'mastered')  return { label: 'Mastered', color: 'var(--accent-text)' }
  if (word.mastery_level === 'reviewing') return { label: 'Review',   color: '#f59e0b' }
  if (word.times_seen === 0)              return { label: 'New',      color: '#60a5fa' }
  return { label: 'Studying', color: 'var(--accent-text)' }
}

interface Props {
  words: VocabWord[]
  loading: boolean
  onToggleFavorite: (word: VocabWord) => void
  onDelete: (id: string) => void
}

const COLUMN_COUNT = 9

export function VocabTable({ words, loading, onToggleFavorite, onDelete }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const allChecked = words.length > 0 && words.every(w => checked[w.id])

  function toggleAll() {
    setChecked(allChecked ? {} : Object.fromEntries(words.map(w => [w.id, true])))
  }

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="w-10 px-4 py-3">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
            </th>
            <Th>Character</Th>
            <Th>Pinyin</Th>
            <Th>Meaning</Th>
            <Th>Type</Th>
            <Th>HSK</Th>
            <Th>Status</Th>
            <th className="w-10" />
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {words.map(word => {
            const status = statusFor(word)
            const posStyle = POS_COLORS[word.pos] ?? POS_COLORS.other
            return (
              <tr key={word.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[word.id])}
                    onChange={() => setChecked(prev => ({ ...prev, [word.id]: !prev[word.id] }))}
                    aria-label={`Select ${word.word_zh}`}
                  />
                </td>
                <td className="px-4 py-3 font-hanzi text-base" style={{ color: 'var(--text-primary)' }}>{word.word_zh}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{word.pinyin}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{word.english}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center text-xs font-medium rounded-lg px-2 py-0.5 capitalize" style={posStyle}>
                    {word.pos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={`hsk-${word.hsk_level}`}>HSK {word.hsk_level}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: status.color }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <button
                    onClick={() => onToggleFavorite(word)}
                    aria-label={word.is_favorite ? `Unfavorite ${word.word_zh}` : `Favorite ${word.word_zh}`}
                    style={{ color: word.is_favorite ? '#fbbf24' : 'var(--text-tertiary)' }}
                  >
                    <StarIcon filled={word.is_favorite} width={16} height={16} />
                  </button>
                </td>
                <td className="px-2 py-3 text-center relative">
                  <button
                    onClick={() => setOpenMenuId(id => id === word.id ? null : word.id)}
                    aria-label="More actions"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <MoreIcon width={16} height={16} />
                  </button>
                  {openMenuId === word.id && (
                    <VocabRowMenu
                      word={word}
                      onDelete={() => { onDelete(word.id); setOpenMenuId(null) }}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </td>
              </tr>
            )
          })}

          {!loading && words.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No words found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </th>
  )
}
```

Note: checkboxes are wired to local component state only (`checked`) — no bulk-action toolbar is built in this pass (see design doc Decision 8 / Out of scope).

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabTable.tsx
git commit -m "Add VocabTable for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 11: `VocabStatsRow`

**Files:**
- Create: `src/components/vocab/VocabStatsRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

import type { RefObject } from 'react'
import { Card } from '@/components/ui/Card'
import { VocabIcon } from '@/components/ui/StatIcons'
import { FavoritesCard } from './FavoritesCard'
import type { FavoriteWord } from '@/hooks/useVocabTable'

interface Props {
  totalWords: number
  favorites: FavoriteWord[]
  onExpandFavorites: () => void
  favoritesCardRef: RefObject<HTMLDivElement | null>
}

/**
 * Two stat cards (not the mockup's four) -- "Mastered" and "Studying"
 * are deliberately excluded per the user's original instruction.
 */
export function VocabStatsRow({ totalWords, favorites, onExpandFavorites, favoritesCardRef }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      <Card padding="lg" className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
        >
          <VocabIcon size={20} />
        </div>
        <div>
          <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{totalWords}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total words</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>All your vocabulary</p>
        </div>
      </Card>

      <FavoritesCard
        ref={favoritesCardRef}
        favorites={favorites}
        onExpand={onExpandFavorites}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabStatsRow.tsx
git commit -m "Add VocabStatsRow for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 12: `VocabPagination`

**Files:**
- Create: `src/components/vocab/VocabPagination.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client'

interface Props {
  page: number
  totalPages: number
  shownCount: number
  totalCount: number
  onPageChange: (page: number) => void
}

/** Collapses to first/last two pages + a window around the current page,
 *  with `…` for any gap -- stays compact regardless of totalPages. */
function pageList(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push('…')
    result.push(p)
  })
  return result
}

export function VocabPagination({ page, totalPages, shownCount, totalCount, onPageChange }: Props) {
  const items = pageList(page, totalPages)

  return (
    <div className="flex items-center justify-between mt-4 text-xs flex-wrap gap-3" style={{ color: 'var(--text-tertiary)' }}>
      <p>Showing {shownCount} of {totalCount} words</p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ‹
        </button>

        {items.map((item, i) => item === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1">…</span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-medium transition-colors"
            style={item === page
              ? { backgroundColor: 'var(--accent)', color: 'white' }
              : { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
            }
          >
            {item}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ›
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocab/VocabPagination.tsx
git commit -m "Add VocabPagination for the vocabulary page redesign

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 13: Rewrite `/vocabulary` page — wire everything together

**Files:**
- Modify: `src/app/(app)/vocabulary/page.tsx` (whole file)

This is the first point every previous task's component gets exercised together — pay attention to the build output.

- [ ] **Step 1: Replace the page**

```tsx
'use client'

import { useRef, useState } from 'react'
import { useProgress } from '@/hooks/useProgress'
import { useVocabTable } from '@/hooks/useVocabTable'
import { VocabPageHeader } from '@/components/vocab/VocabPageHeader'
import { VocabStatsRow } from '@/components/vocab/VocabStatsRow'
import { VocabFilterBar } from '@/components/vocab/VocabFilterBar'
import { VocabTable } from '@/components/vocab/VocabTable'
import { VocabPagination } from '@/components/vocab/VocabPagination'
import { FavoritesExpandedPanel } from '@/components/vocab/FavoritesExpandedPanel'

export default function VocabularyPage() {
  const { vocabCount, settings } = useProgress()
  const {
    words, totalCount, totalPages, loading, error,
    page, setPage,
    hsk, setHsk,
    pos, setPos,
    searchInput, setSearchInput,
    sort, setSort,
    favorites, setFavorite, unfavorite, deleteWord,
  } = useVocabTable()

  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const favoritesCardRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen px-6 py-8 w-full max-w-6xl mx-auto">
      <VocabPageHeader vocabCount={vocabCount} hskLevel={settings?.starting_hsk} />

      <VocabStatsRow
        totalWords={vocabCount}
        favorites={favorites}
        onExpandFavorites={() => setFavoritesExpanded(true)}
        favoritesCardRef={favoritesCardRef}
      />

      <VocabFilterBar
        hsk={hsk} onHskChange={setHsk}
        pos={pos} onPosChange={setPos}
        searchInput={searchInput} onSearchInputChange={setSearchInput}
        sort={sort} onSortChange={setSort}
      />

      {error && (
        <p className="text-xs mb-3" style={{ color: 'var(--error-text)' }} role="alert">
          Could not load vocabulary: {error}
        </p>
      )}

      <VocabTable
        words={words}
        loading={loading}
        onToggleFavorite={word => setFavorite(word, !word.is_favorite)}
        onDelete={deleteWord}
      />

      <VocabPagination
        page={page}
        totalPages={totalPages}
        shownCount={words.length}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      {favoritesExpanded && (
        <FavoritesExpandedPanel
          favorites={favorites}
          anchorRef={favoritesCardRef}
          onUnfavorite={unfavorite}
          onClose={() => setFavoritesExpanded(false)}
        />
      )}
    </div>
  )
}
```

Note the two different counts in play — `vocabCount` (from `useProgress`, the user's true unfiltered total, used for both the header and the "Total words" stat card) vs `totalCount` (from `useVocabTable`, the *filtered* count, used only in the pagination label "Showing N of `totalCount`"). Don't conflate them.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: succeeds with no TypeScript errors across all the new components.

Run: `npm run lint`
Expected: the same problem count as this repo's established baseline (11 errors / 3 warnings, all pre-existing, all outside `src/components/vocab/` and `src/hooks/useVocabTable.ts`) — nothing new from this task's files.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/vocabulary/page.tsx"
git commit -m "Rewrite /vocabulary to match the redesign mockup

Composes VocabPageHeader/VocabStatsRow/VocabFilterBar/VocabTable/
VocabPagination + FavoritesExpandedPanel, driven by useVocabTable.
VocabBrowser/useVocabSheet (dashboard overlay) are untouched.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Nqzn74gktBL3vecCEKVfaU"
```

---

### Task 14: Apply the migration and manually verify

**Files:** none (verification only)

- [ ] **Step 1: Apply the migration**

Run: `supabase db push` (or paste `supabase/migrations/20260919000000_add_vocab_favorites.sql` into the Supabase dashboard's SQL editor for this project).
Expected: `vocab_list` now has an `is_favorite` column, default `false`.

- [ ] **Step 2: Manual click-through**

With `npm run dev` running and signed in, on `/vocabulary`:
- HSK Level pills and Word Type pills each filter the table (single-select, clicking the active one again clears it back to "All").
- Search box: typing waits ~300ms before the table updates (debounce), and `⌘K`/`Ctrl+K` from anywhere on the page focuses it.
- Sort dropdown switches between Newest/Oldest.
- Numbered pagination: jumping between pages 1/2/3/…/last shows different words; "Showing N of Total" matches the active filters.
- Star icon in a row toggles favorite status immediately (optimistic) and appears in the Favorites card's preview list.
- Favorites card: shows up to 3 favorites; clicking it (or "Show all") opens the expanded panel anchored at the card's corner, backdrop blurred; unfavoriting from inside the panel removes it from both the panel and the table row's star.
- Favorite a 4th+ word and confirm the panel's internal list scrolls once it's taller than its `max-h-[70vh]`.
- Row "•••" → "Delete word" → confirm/cancel both work; confirming removes the row and decrements the counts; deleting the last item on a page beyond page 1 moves back a page automatically.
- HSK badge in the header shows your real `starting_hsk` and word count, with no chevron/dropdown affordance (it's not clickable).

- [ ] **Step 3: Report results to the user**

If anything in Step 2 doesn't match, note exactly what and fix before considering this plan complete — don't claim success without having gone through this checklist.
