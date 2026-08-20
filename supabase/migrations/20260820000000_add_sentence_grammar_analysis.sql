-- The sentence-analysis screen shows a "Grammar Focus" panel (a specific
-- grammar point in the sentence, e.g. "过 (guò) — Aspect Marker") and a
-- "Sentence Breakdown" panel (each word/segment tagged with its grammatical
-- role: Subject/Verb/Object/Question-particle/Measure-word/Other). Neither
-- exists today. This content is cached at the SENTENCE level, not per
-- attempt — grammar/structure are properties of the sentence itself, not of
-- any particular wrong answer, and a shared sentence_bank means the same
-- sentence is graded by many users repeatedly. Caching here means Claude
-- only ever analyzes a given sentence's grammar once.

ALTER TABLE public.sentence_bank
  ADD COLUMN grammar_focus jsonb,
  ADD COLUMN sentence_structure jsonb;

ALTER TABLE public.generated_sentences
  ADD COLUMN grammar_focus jsonb,
  ADD COLUMN sentence_structure jsonb;

-- Both sentence_bank and generated_sentences have no UPDATE policy for
-- anon/authenticated (sentence_bank is shared read-only content managed by
-- the service role; generated_sentences only has SELECT/INSERT for the
-- owning user) — RLS default-denies UPDATE from the route's cookie-scoped
-- client, so writing the analysis back requires a SECURITY DEFINER RPC, same
-- as find_cached_grade/record_word_attempt already do for their own
-- RLS-restricted writes.
--
-- A single function with a table-name discriminator, rather than two typed
-- functions, since both tables' target columns and update shape are
-- identical — plpgsql's IF/CASE is enough to dispatch, and it keeps the
-- route's call site to one RPC name regardless of practice mode.
--
-- No ownership check beyond "row exists": sentence_bank is shared read-only
-- content and generated_sentences' grammar/structure fields aren't
-- per-user-sensitive — just a shared cache of that sentence's fixed
-- grammatical structure — so a plain UPDATE ... WHERE id = p_sentence_id is
-- sufficient.
CREATE FUNCTION public.set_sentence_grammar_analysis(
  p_table              text,
  p_sentence_id        uuid,
  p_grammar_focus      jsonb,
  p_sentence_structure jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_table = 'sentence_bank' THEN
    UPDATE public.sentence_bank
    SET grammar_focus = p_grammar_focus,
        sentence_structure = p_sentence_structure
    WHERE id = p_sentence_id;
  ELSIF p_table = 'generated_sentences' THEN
    UPDATE public.generated_sentences
    SET grammar_focus = p_grammar_focus,
        sentence_structure = p_sentence_structure
    WHERE id = p_sentence_id;
  ELSE
    RAISE EXCEPTION 'set_sentence_grammar_analysis: unknown table "%"', p_table;
  END IF;
END;
$$;

-- This project has `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA
-- public GRANT ALL ON FUNCTIONS TO anon` in effect (see
-- 20260806171015_drop_p_user_id_use_auth_uid.sql), so every new CREATE
-- FUNCTION is auto-granted to anon unless explicitly revoked — every
-- existing RPC in this project follows with this same REVOKE/GRANT block.
REVOKE ALL ON FUNCTION public.set_sentence_grammar_analysis(text, uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_sentence_grammar_analysis(text, uuid, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_sentence_grammar_analysis(text, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_sentence_grammar_analysis(text, uuid, jsonb, jsonb) TO service_role;
