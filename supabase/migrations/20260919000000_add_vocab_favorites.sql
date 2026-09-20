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
