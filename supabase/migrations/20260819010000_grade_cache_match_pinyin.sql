-- find_cached_grade previously matched only on (sentence_zh, strictness_used,
-- normalized answer). Chinese has genuine heteronyms (多音字) — the same
-- character string can carry more than one reading/meaning (e.g. 还 hái
-- "still" vs huán "return") — and sentence_py is shown directly to the user
-- when show_pinyin is 'always'/'tap', so it can carry the actual intended
-- reading for a given sentence_zh. Widening the match key to require
-- sentence_py too closes the (narrow, but real) risk of reusing a grade
-- computed for a different intended reading of the same characters.

DROP FUNCTION IF EXISTS public.find_cached_grade(text, smallint, text);

CREATE FUNCTION public.find_cached_grade(
  p_sentence_zh text,
  p_sentence_py text,
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
    AND sentence_py = p_sentence_py
    AND strictness_used = p_strictness
    AND user_answer_normalized = public.normalize_answer(p_user_answer)
    AND feedback IS NOT NULL
  ORDER BY attempted_at DESC
  LIMIT 1
$$;

-- Same default-privileges auto-grant-to-anon concern as the original
-- function — DROP removed the old grants along with the old signature, so
-- the new one needs this block again.
REVOKE ALL ON FUNCTION public.find_cached_grade(text, text, smallint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_cached_grade(text, text, smallint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_cached_grade(text, text, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cached_grade(text, text, smallint, text) TO service_role;

DROP INDEX IF EXISTS public.sentence_attempts_cache_lookup_idx;

CREATE INDEX sentence_attempts_cache_lookup_idx
  ON public.sentence_attempts (sentence_zh, sentence_py, strictness_used, user_answer_normalized, attempted_at DESC)
  INCLUDE (score, correct_answer, feedback)
  WHERE feedback IS NOT NULL;
