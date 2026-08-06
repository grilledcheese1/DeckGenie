-- Remove the p_user_id parameter from claim_unlock, complete_round, and
-- record_word_attempt entirely, deriving the user from auth.uid() internally
-- instead. The prior fix (see 20260806024622) kept the parameter and validated
-- it against auth.uid(); removing it outright closes the same hole with no
-- reliance on caller-supplied identity at all, and simplifies every call site.
--
-- Signature changes require DROP + CREATE rather than CREATE OR REPLACE.
-- NOTE: this schema has `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA
-- public GRANT ALL ON FUNCTIONS TO anon` in effect, so every DROP+CREATE below
-- re-grants anon EXECUTE by default — the REVOKE statements after each CREATE
-- are not optional cleanup, they undo that default grant.

DROP FUNCTION IF EXISTS public.claim_unlock(uuid);

CREATE FUNCTION public.claim_unlock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.progress
  SET last_claimed_round = rounds_completed
  WHERE user_id = auth.uid();
END;
$$;

DROP FUNCTION IF EXISTS public.complete_round(uuid, integer, integer, integer, numeric, integer, smallint);

CREATE FUNCTION public.complete_round(
  p_round_number integer,
  p_sentences_total integer,
  p_sentences_correct integer,
  p_accuracy_pct numeric,
  p_top_streak integer,
  p_strictness smallint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_round_id       uuid;
  v_today          date := CURRENT_DATE;
  v_last_practiced timestamptz;
  v_streak         integer;
  v_longest        integer;
BEGIN
  -- Insert round summary
  INSERT INTO public.round_summaries
    (user_id, round_number, sentences_total, sentences_correct, accuracy_pct, top_streak, strictness_used)
  VALUES
    (v_user_id, p_round_number, p_sentences_total, p_sentences_correct, p_accuracy_pct, p_top_streak, p_strictness)
  RETURNING id INTO v_round_id;

  -- Upsert daily stats
  INSERT INTO public.daily_stats (user_id, date, sentences_done, sentences_correct, rounds_done)
  VALUES (v_user_id, v_today, p_sentences_total, p_sentences_correct, 1)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sentences_done    = public.daily_stats.sentences_done    + p_sentences_total,
    sentences_correct = public.daily_stats.sentences_correct + p_sentences_correct,
    rounds_done       = public.daily_stats.rounds_done       + 1,
    updated_at        = NOW();

  -- Compute streak
  SELECT last_practiced_at, streak_days, longest_streak_days
  INTO v_last_practiced, v_streak, v_longest
  FROM public.progress WHERE user_id = v_user_id;

  IF v_last_practiced IS NULL THEN
    v_streak := 1;
  ELSIF DATE(v_last_practiced) = v_today THEN
    NULL; -- already practiced today, no change
  ELSIF DATE(v_last_practiced) = v_today - 1 THEN
    v_streak := v_streak + 1; -- consecutive day
  ELSE
    v_streak := 1; -- streak broken
  END IF;

  v_longest := GREATEST(v_longest, v_streak);

  UPDATE public.progress SET
    last_practiced_at   = NOW(),
    streak_days         = v_streak,
    longest_streak_days = v_longest
  WHERE user_id = v_user_id;

  RETURN v_round_id;
END;
$$;

DROP FUNCTION IF EXISTS public.record_word_attempt(uuid, text, boolean);

CREATE FUNCTION public.record_word_attempt(
  p_word_zh text,
  p_correct boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.vocab_list
  SET
    times_seen      = times_seen + 1,
    times_correct   = times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END,
    last_seen_at    = NOW(),
    last_correct_at = CASE WHEN p_correct THEN NOW() ELSE last_correct_at END,
    mastery_level   = CASE
      WHEN (times_seen + 1) < 5 THEN 'learning'
      WHEN (times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::numeric
           / (times_seen + 1) >= 0.8 THEN 'mastered'
      WHEN (times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::numeric
           / (times_seen + 1) >= 0.5 THEN 'reviewing'
      ELSE 'learning'
    END
  WHERE user_id = auth.uid() AND word_zh = p_word_zh;
END;
$$;

-- Undo the default-privilege auto-grant to anon/public; authenticated (and
-- service_role, unchanged from before) are the only roles that should execute these.
REVOKE ALL ON FUNCTION public.claim_unlock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_unlock() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_unlock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_unlock() TO service_role;

REVOKE ALL ON FUNCTION public.complete_round(integer, integer, integer, numeric, integer, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_round(integer, integer, integer, numeric, integer, smallint) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_round(integer, integer, integer, numeric, integer, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_round(integer, integer, integer, numeric, integer, smallint) TO service_role;

REVOKE ALL ON FUNCTION public.record_word_attempt(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_word_attempt(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_word_attempt(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_word_attempt(text, boolean) TO service_role;

-- sentence_attempts has RLS enabled but was missing an INSERT policy entirely,
-- so /api/grade's insert into it has been silently failing (error is only
-- console.error'd, never surfaced). Adding the same auth.uid() = user_id
-- pattern used by every other table's write policies.
CREATE POLICY "sentence_attempts_insert" ON "public"."sentence_attempts"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
