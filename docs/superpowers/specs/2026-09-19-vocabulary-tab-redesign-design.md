# Vocabulary tab redesign

## Problem

The standalone `/vocabulary` page currently reuses `VocabBrowser` (a compact overlay-style filter/list), which is shared with the dashboard's `VocabSheet` bottom-sheet. The user wants `/vocabulary`'s content area (everything right of the sidebar) rebuilt to match a supplied reference mockup (`public/vocab_tab_refactor.png`) pixel-for-pixel — a full data-table layout with stat cards, rich filters, a real data table, and real pagination — plus a new favorites feature and a delete-with-confirm row action, decided through brainstorming (see Decisions below).

## Reference

`public/vocab_tab_refactor.png`. Excluded from the mockup per explicit instruction: the "Mastered" stat card and the "86 Studying" stat card. Kept: "Total words" and "Favorites" (redesigned, see below).

## Scope

- **Only** `/vocabulary` (`src/app/(app)/vocabulary/page.tsx`) and new components/hook dedicated to it.
- `VocabBrowser`, `VocabSheet`, `VocabCard`, `VocabSlideView` (the dashboard overlay's stack) are **untouched** — they keep their existing infinite-scroll UI.
- `Badge.tsx`'s shared `POS_STYLE`/`STATUS_STYLES` are **not modified** — this page defines its own local color maps so the practice-page analysis table's badges don't change appearance.
- Left sidebar/nav: unchanged.

## Decisions from brainstorming

1. **Favorites**: real feature, backed by a new `is_favorite` column (not local-only, not wired into sentence-generation priority — bookmark only, for now).
2. **Favorites card** (top-right stat slot): vertical list preview (top 3 favorites: zh/pinyin/english), "+N more · Show all →" when there are more.
3. **Expanded favorites view**: panel grows anchored at the card's own top-right corner (not a centered dialog), backdrop dimmed + blurred (matching `UnlockModal`'s convention), internal scroll once tall, GSAP scale/fade-in from that corner.
4. **Status column**: **correction from what we discussed** — `vocab_list` already has a real, server-maintained `mastery_level` column (`'learning' | 'reviewing' | 'mastered'`), updated by the `record_word_attempt` RPC after every graded attempt (`/api/grade/route.ts`) using its own accuracy thresholds (<5 attempts or <50% → learning, ≥80% → mastered, ≥50% → reviewing). This isn't in the `VocabWord` TypeScript type today (an existing gap between the type and the real schema), but it's live, real data — more accurate than deriving a second, slightly-different heuristic client-side via `getWordStatus`. Use it directly: `mastered`→Mastered, `reviewing`→Review, `learning` with `times_seen = 0`→New, `learning` with `times_seen > 0`→Studying. Still dot+label, not a pill badge.
5. **HSK badge** (top-right, "HSK 3" + "N words active"): **read-only** display. Rendered as a plain static chip — no chevron/dropdown affordance, since a non-functional dropdown control would be misleading.
6. **Pagination**: real, 8 words/page, numbered controls, backed by Supabase range queries (not infinite scroll).
7. **Row "•••" menu**: small popover (mirrors `CharTooltip`'s anchor/flip/GSAP convention) → "Delete word" → same popover swaps to a "Delete 高兴? [Cancel] [Delete]" confirm state → confirming deletes.
8. **Checkboxes**: rendered and individually togglable for visual parity, but **no bulk-action toolbar** in this pass (not asked for, not shown functioning in the mockup).
9. **Known deviation**: mockup shows a "Numeral" word-type for "一"; the real `pos` enum has no such value (`noun/verb/adjective/adverb/other`). Real `pos` values are rendered as-is.

## Data model changes

### Migration (new): `supabase/migrations/<timestamp>_add_vocab_favorites.sql`

```sql
alter table vocab_list add column is_favorite boolean not null default false;
create index vocab_list_user_favorite_idx on vocab_list (user_id, is_favorite) where is_favorite;
```

RLS already scopes `vocab_list` by `user_id` (existing policy) — no new policy needed, this is just a new column. **I'll write this migration file; it needs to be applied to your Supabase project (`supabase db push` or via the dashboard) before the favorites feature works.**

`VocabWord` type (`src/types/index.ts`) gains `is_favorite: boolean` **and** `mastery_level: 'learning' | 'reviewing' | 'mastered'` (the latter closes an existing gap — the column has been live in the DB since migration `20260806023645_remote_schema.sql`, the type just never included it).

## Architecture

### `src/hooks/useVocabTable.ts` (new)

Dedicated data hook for this page — does not touch `useVocabSheet`. Owns:

- **Filters**: `{ hsk: number | null, pos: string | null, search: string, sort: 'newest' | 'oldest' }`.
- **Paginated fetch**: `page` (1-indexed) × `PAGE_SIZE = 8`. On any filter/sort/page change, queries:
  ```
  supabase.from('vocab_list').select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .{eq hsk/pos if set}
    .{or search if set, same ilike pattern as useVocabSheet}
    .order('unlocked_at', { ascending: sort === 'oldest' })
    .range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1)
  ```
  Returns `words`, `totalCount` (from the query's `count`), `totalPages = Math.ceil(totalCount / PAGE_SIZE)`.
- **Request-id race guard**: same pattern as this session's earlier `useVocabSheet` fix — a `requestIdRef` so a slow, stale page/filter fetch can't clobber a newer one.
- **Favorites** (independent of pagination): `favorites: Pick<VocabWord, 'id'|'word_zh'|'pinyin'|'english'>[]`, fetched once on mount (`eq('is_favorite', true)`, ordered newest-first) and kept in sync locally (below) rather than refetched on every toggle.
- **`toggleFavorite(id: string)`**: optimistic — flips `is_favorite` in `words` (if that row is on the current page) and adds/removes the entry in `favorites`, fires `supabase.from('vocab_list').update({ is_favorite }).eq('id', id)`, rolls back both local updates on failure.
- **`deleteWord(id: string)`**: removes from `words` + decrements `totalCount` optimistically, fires the delete query (same shape as `useVocabSheet.removeWord`, using cached `getSession()`); if the current page is now empty and it's not page 1, moves to `page - 1`. Also removes the word from `favorites` if it was starred.
- Debounced `search` setter (~300ms) so filter changes don't fire a query per keystroke.

### `src/components/vocab/VocabPageHeader.tsx` (new)

Title "Vocabulary" + subtitle, the read-only HSK chip (`settings.starting_hsk`, `{vocabCount} words active`), and the "SMALL STEPS · BIG PROGRESS" wordmark + leaf glyph (small new presentational bit, styled per the mockup, page-scoped).

### `src/components/vocab/VocabStatsRow.tsx` (new)

Two cards (not four): "Total words" (`VocabIcon`, `vocabCount` from `useProgress`) and `FavoritesCard`.

### `src/components/vocab/FavoritesCard.tsx` (new)

Renders the top 3 `favorites` entries as rows (zh/pinyin/english) + "+N more · Show all →" when `favorites.length > 3`. Clicking the card (or the "Show all" link) opens `FavoritesExpandedPanel`. Empty state ("No favorites yet") when the list is empty.

### `src/components/vocab/FavoritesExpandedPanel.tsx` (new)

- `fixed inset-0` backdrop (`rgba(0,0,0,0.6)` + `backdropFilter: blur(4px)`, matching `UnlockModal`), click-to-close.
- Panel: `absolute`, anchored to the stat card's position (top-right area), `max-height` capped with `overflow-y-auto` once favorites exceed it.
- GSAP mount animation: scale 0.95→1 + fade, transform-origin at the panel's own top-right corner (same easing/duration family as `CharTooltip`'s 0.2s `power2.out`).
- Lists every favorite (zh/pinyin/english + a star to unfavorite inline), header "All Favorites (N)" + ✕ close.

### `src/components/vocab/VocabFilterBar.tsx` (new)

Search input (debounced, `⌘K` hint that's wired to a real global keydown listener focusing the input) + HSK Level pill row + Word Type pill row (single-select each, green active pill — same `selectedAllPill`/`unselectedPill` visual convention `VocabBrowser` already uses) + Sort dropdown (Newest/Oldest).

### `src/components/vocab/VocabTable.tsx` (new)

Header row (checkbox, Character, Pinyin, Meaning, Type, HSK, Status, ★, •••) + body rows. Per row:
- Checkbox: local toggle state only, no bulk action wired.
- Type badge: local `POS_COLORS` map (adjective=blue, noun=reuses `var(--accent-subtle)`/`var(--accent-text)`, verb=purple, adverb=amber, other=reuses existing neutral `var(--bg-tertiary)`/`var(--text-tertiary)`/`var(--border)`).
- HSK badge: reuses `Badge.tsx`'s existing `HSK_STYLES`/tone system directly (no change needed there).
- Status: dot + label, derived directly from the real `mastery_level` + `times_seen` fields (see Decision 4) — not `getWordStatus` (that heuristic stays untouched, used only where it already is, e.g. the practice analysis table).
- ★: filled if `is_favorite`, calls `toggleFavorite`.
- •••: `VocabRowMenu`.

### `src/components/vocab/VocabRowMenu.tsx` (new)

Mirrors `CharTooltip.tsx`'s convention: absolute-positioned popover anchored to the "•••" button, `resolvePlacement`-style flip to stay on-screen, full-screen invisible click-catcher to dismiss, GSAP fade+scale entrance. Two internal states: `menu` (shows "Delete word") → `confirm` ("Delete 高兴? " + Cancel/Delete buttons) → confirming calls `deleteWord(word.id)` and closes.

### `src/components/vocab/VocabPagination.tsx` (new)

"Showing {words.length} of {totalCount} words" (left) + prev arrow, numbered buttons (1, 2, 3, `…`, last — collapsed the same way for any `totalPages`), next arrow (right). Active page pill uses the app's accent color.

### `src/app/(app)/vocabulary/page.tsx` (rewritten)

Composes the above: `VocabPageHeader`, `VocabStatsRow`, `VocabFilterBar`, `VocabTable`, `VocabPagination`, all driven by one `useVocabTable()` call. No more `VocabBrowser`/`useVocabSheet` import here.

## Edge cases

- Deleting the only word on the last page (not page 1) moves back a page automatically rather than showing an empty page.
- Unfavoriting a word from inside `FavoritesExpandedPanel` removes it from that list immediately (optimistic) and, if it's also on the currently-displayed table page, unstars it there too.
- A word that's favorited but filtered out of the current table view (e.g. HSK filter excludes it) still appears correctly in the Favorites card/panel — favorites are fetched independent of the table's filters/pagination.
- Search/filter/sort changes reset to page 1.

## Out of scope

- No bulk select/delete toolbar.
- No wiring of favorites into `/api/generate`'s sentence-selection logic.
- No changes to `VocabBrowser`/`VocabSheet`/`VocabCard` (dashboard overlay).
- No new HSK-level-change control on this page (that stays dashboard/settings-only).
- No mobile-specific mockup was provided — mobile/narrow-viewport layout follows the app's existing responsive conventions (stacking cards, horizontal table scroll) rather than a pixel spec.

## Verification

No automated test framework in this repo. Verify via:
1. `npm run build` / `npm run lint` clean (matching this session's established baseline).
2. Apply the migration, then manually click through: HSK/type filters, search (debounce + `⌘K` focus), sort, numbered page navigation, favoriting/unfavoriting from the table and from the expanded panel, the expand/collapse animation and its overflow-scroll once favorites exceed the panel height, the delete confirm flow (cancel path and confirm path), and the HSK badge showing the right level/count.
