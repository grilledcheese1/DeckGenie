-- Close a cross-user access hole: claim_unlock, complete_round, and record_word_attempt
-- are SECURITY DEFINER and were granted to anon, but never verified that the caller-supplied
-- p_user_id matched the authenticated caller. Any client holding just the public anon key
-- could pass an arbitrary p_user_id and mutate another user's progress/vocab/streak data.

CREATE OR REPLACE FUNCTION public.claim_unlock(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must match the authenticated user';
  END IF;

  UPDATE public.progress
  SET last_claimed_round = rounds_completed
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_round(
  p_user_id uuid,
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
  v_round_id       uuid;
  v_today          date := CURRENT_DATE;
  v_last_practiced timestamptz;
  v_streak         integer;
  v_longest        integer;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must match the authenticated user';
  END IF;

  -- Insert round summary
  INSERT INTO public.round_summaries
    (user_id, round_number, sentences_total, sentences_correct, accuracy_pct, top_streak, strictness_used)
  VALUES
    (p_user_id, p_round_number, p_sentences_total, p_sentences_correct, p_accuracy_pct, p_top_streak, p_strictness)
  RETURNING id INTO v_round_id;

  -- Upsert daily stats
  INSERT INTO public.daily_stats (user_id, date, sentences_done, sentences_correct, rounds_done)
  VALUES (p_user_id, v_today, p_sentences_total, p_sentences_correct, 1)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sentences_done    = public.daily_stats.sentences_done    + p_sentences_total,
    sentences_correct = public.daily_stats.sentences_correct + p_sentences_correct,
    rounds_done       = public.daily_stats.rounds_done       + 1,
    updated_at        = NOW();

  -- Compute streak
  SELECT last_practiced_at, streak_days, longest_streak_days
  INTO v_last_practiced, v_streak, v_longest
  FROM public.progress WHERE user_id = p_user_id;

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
  WHERE user_id = p_user_id;

  RETURN v_round_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_word_attempt(
  p_user_id uuid,
  p_word_zh text,
  p_correct boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must match the authenticated user';
  END IF;

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
  WHERE user_id = p_user_id AND word_zh = p_word_zh;
END;
$$;

-- Defense in depth: these functions can only ever succeed for the caller's own id now,
-- so anon (unauthenticated) callers have no legitimate use for them.
REVOKE ALL ON FUNCTION public.claim_unlock(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.complete_round(uuid, integer, integer, integer, numeric, integer, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.record_word_attempt(uuid, text, boolean) FROM anon;

-- Fix a related cross-user leak: vocab_stats is a plain view owned by postgres over a
-- table also owned by postgres, so Postgres bypasses vocab_list's RLS policies for the
-- view (view owner bypass) — any caller querying vocab_stats sees every user's aggregates.
-- security_invoker makes the view apply RLS as the querying role instead.
ALTER VIEW public.vocab_stats SET (security_invoker = true);
REVOKE ALL ON TABLE public.vocab_stats FROM anon;
