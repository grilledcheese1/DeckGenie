-- Static practice mode lets users practice from a pre-written, curated
-- sentence corpus instead of the AI-generated flow, so they can start
-- practicing immediately without configuring an API key. This adds the
-- shared sentence_bank corpus (read-only to clients, managed by the
-- service role / admin tooling) and a practice_mode toggle on settings
-- so each user can choose which flow they're using.

CREATE TABLE IF NOT EXISTS public.sentence_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_zh text NOT NULL,
  sentence_py text NOT NULL,
  canonical_en text NOT NULL,
  vocab_used text[] NOT NULL,
  hsk_level int NOT NULL,
  pos text,
  topic text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sentence_bank ENABLE ROW LEVEL SECURITY;

-- sentence_bank is shared, non-user content: anyone (including
-- unauthenticated users) can read it, but only the service role
-- (server-side, bypasses RLS) can write to it. No INSERT/UPDATE/DELETE
-- policy is defined, so those operations are denied by RLS's default-deny
-- for anon/authenticated — same pattern as generated_sentences.
CREATE POLICY "sentence_bank_select" ON public.sentence_bank
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.settings
  ADD COLUMN practice_mode text NOT NULL DEFAULT 'static'
    CHECK (practice_mode IN ('ai', 'static'));
