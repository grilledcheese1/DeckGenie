-- The word-unlock gate (earn words_per_unlock words every rounds_before_unlock
-- rounds) was enforced only in client JS. Worse, granting words (/api/words)
-- and claiming the unlock (the old claim_unlock() RPC, called separately by
-- the client) were two independent, unguarded steps, so a double-submit could
-- double-claim. claim_word_unlock() makes the entitlement check and the
-- last_claimed_round bump one atomic, row-locked operation that /api/words
-- calls server-side before granting any words. The old claim_unlock() is
-- superseded and removed — the client no longer claims anything directly.

DROP FUNCTION IF EXISTS public.claim_unlock();

CREATE FUNCTION public.claim_word_unlock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id              uuid := auth.uid();
  v_vocab_count           integer;
  v_rounds_completed      integer;
  v_last_claimed_round    integer;
  v_rounds_before_unlock  integer;
BEGIN
  SELECT count(*) INTO v_vocab_count FROM public.vocab_list WHERE user_id = v_user_id;

  -- First-run seeding: no rounds completed yet, nothing to claim.
  IF v_vocab_count = 0 THEN
    RETURN;
  END IF;

  -- Lock the progress row so concurrent claims serialize instead of racing —
  -- without this, two simultaneous requests could both read "entitled" before
  -- either writes last_claimed_round.
  SELECT rounds_completed, last_claimed_round
  INTO v_rounds_completed, v_last_claimed_round
  FROM public.progress
  WHERE user_id = v_user_id
  FOR UPDATE;

  SELECT rounds_before_unlock INTO v_rounds_before_unlock
  FROM public.settings
  WHERE user_id = v_user_id;

  v_rounds_before_unlock := COALESCE(v_rounds_before_unlock, 3);

  IF v_rounds_completed IS NULL
     OR v_rounds_completed <= 0
     OR v_rounds_completed % v_rounds_before_unlock <> 0
     OR v_rounds_completed <= COALESCE(v_last_claimed_round, 0)
  THEN
    RAISE EXCEPTION 'No unlock available';
  END IF;

  UPDATE public.progress
  SET last_claimed_round = v_rounds_completed
  WHERE user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_word_unlock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_word_unlock() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_word_unlock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_word_unlock() TO service_role;
