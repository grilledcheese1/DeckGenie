-- The grading flow used to trust sentence_zh/sentence_py/user_answer verbatim
-- from the client, so nothing verified the server actually issued the sentence
-- being graded. This table records every sentence /api/generate hands out, so
-- /api/grade can load the trusted copy by id instead of accepting sentence text
-- from the client at all.

CREATE TABLE IF NOT EXISTS public.generated_sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sentence_zh text NOT NULL,
  sentence_py text NOT NULL,
  vocab_used text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_sentences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_sentences_select" ON public.generated_sentences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "generated_sentences_insert" ON public.generated_sentences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
