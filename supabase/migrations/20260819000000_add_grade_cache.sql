-- Turns sentence_attempts into a cross-user grading cache for /api/grade.
-- Static-mode grading always spends the app's own ANTHROPIC_API_KEY, and the
-- static sentence_bank is shared across all users, so an exact-match cache on
-- (sentence_zh, strictness_used, normalized user_answer) can skip a real
-- Anthropic call whenever the same wrong answer has already been graded
-- before, by any user.

-- feedback was never persisted by /api/grade's insert — required to
-- reconstruct a complete GradeResponse from a cached row.
ALTER TABLE public.sentence_attempts ADD COLUMN feedback text;

-- Normalization lives in exactly one place (SQL), reused by the generated
-- column below and by the lookup RPC, so application code never duplicates
-- this logic.
CREATE FUNCTION public.normalize_answer(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(trim(regexp_replace(p, '\s+', ' ', 'g')))
$$;

-- Indexable, always-consistent normalized form of user_answer.
ALTER TABLE public.sentence_attempts
  ADD COLUMN user_answer_normalized text
  GENERATED ALWAYS AS (public.normalize_answer(user_answer)) STORED;

-- Cross-user cache lookup. SECURITY DEFINER to read across all users' rows
-- for this one narrow, controlled purpose — bypasses the
-- sentence_attempts_select RLS policy (auth.uid() = user_id) deliberately.
-- Returns only derived grading fields, never user_id or another user's raw
-- answer text (the caller already knows their own answer — they just
-- submitted it in this same request).
CREATE FUNCTION public.find_cached_grade(
  p_sentence_zh text,
  p_strictness   smallint,
  p_user_answer  text
)
RETURNS TABLE(score smallint, correct_answer text, feedback text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT score, correct_answer, feedback
  FROM public.sentence_attempts
  WHERE sentence_zh = p_sentence_zh
    AND strictness_used = p_strictness
    AND user_answer_normalized = public.normalize_answer(p_user_answer)
    AND feedback IS NOT NULL
  ORDER BY attempted_at DESC
  LIMIT 1
$$;

-- Covering partial index matching the RPC's predicates exactly, so the
-- lookup is index-only (score/correct_answer/feedback via INCLUDE) and the
-- ORDER BY ... LIMIT 1 needs no separate sort. Partial on feedback IS NOT
-- NULL keeps the index small (excludes pre-migration rows) and matches the
-- RPC's own filter so the planner will actually pick it.
CREATE INDEX sentence_attempts_cache_lookup_idx
  ON public.sentence_attempts (sentence_zh, strictness_used, user_answer_normalized, attempted_at DESC)
  INCLUDE (score, correct_answer, feedback)
  WHERE feedback IS NOT NULL;

-- This project has `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA
-- public GRANT ALL ON FUNCTIONS TO anon` in effect (see
-- 20260806171015_drop_p_user_id_use_auth_uid.sql), so every new CREATE
-- FUNCTION is auto-granted to anon unless explicitly revoked — every
-- existing RPC in this project follows with this same REVOKE/GRANT block.
REVOKE ALL ON FUNCTION public.normalize_answer(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_answer(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.normalize_answer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_answer(text) TO service_role;

REVOKE ALL ON FUNCTION public.find_cached_grade(text, smallint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_cached_grade(text, smallint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_cached_grade(text, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cached_grade(text, smallint, text) TO service_role;
