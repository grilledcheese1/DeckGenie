-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.claim_unlock (
  p_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
 BEGIN
   UPDATE public.progress
   SET last_claimed_round = rounds_completed
   WHERE user_id = p_user_id;
 END;
 $function$;

GRANT ALL ON FUNCTION public.claim_unlock(uuid) TO anon;

GRANT ALL ON FUNCTION public.claim_unlock(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.claim_unlock(uuid) TO service_role;

CREATE FUNCTION public.complete_round (
  p_user_id           uuid,
  p_round_number      integer,
  p_sentences_total   integer,
  p_sentences_correct integer,
  p_accuracy_pct      numeric,
  p_top_streak        integer,
  p_strictness        smallint
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
 DECLARE
   v_round_id       UUID;
   v_today          DATE := CURRENT_DATE;
   v_last_practiced TIMESTAMPTZ;
   v_streak         INTEGER;
   v_longest        INTEGER;
 BEGIN
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
 $function$;

GRANT ALL ON FUNCTION public.complete_round(uuid, integer, integer, integer, numeric, integer, smallint) TO anon;

GRANT ALL ON FUNCTION public.complete_round(uuid, integer, integer, integer, numeric, integer, smallint) TO authenticated;

GRANT ALL ON FUNCTION public.complete_round(uuid, integer, integer, integer, numeric, integer, smallint) TO service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
 BEGIN
   INSERT INTO public.settings (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
   INSERT INTO public.progress (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
   RETURN new;
 END;
 $function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
 BEGIN new.updated_at = now(); RETURN new; END;
 $function$;

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;

CREATE FUNCTION public.record_word_attempt (
  p_user_id uuid,
  p_word_zh text,
  p_correct boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
 BEGIN
   UPDATE public.vocab_list
   SET
     times_seen      = times_seen + 1,
     times_correct   = times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END,
     last_seen_at    = NOW(),
     last_correct_at = CASE WHEN p_correct THEN NOW() ELSE last_correct_at END,
     mastery_level   = CASE
       WHEN (times_seen + 1) < 5 THEN 'learning'
       WHEN (times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::NUMERIC
            / (times_seen + 1) >= 0.8 THEN 'mastered'
       WHEN (times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::NUMERIC
            / (times_seen + 1) >= 0.5 THEN 'reviewing'
       ELSE 'learning'
     END
   WHERE user_id = p_user_id AND word_zh = p_word_zh;
 END;
 $function$;

GRANT ALL ON FUNCTION public.record_word_attempt(uuid, text, boolean) TO anon;

GRANT ALL ON FUNCTION public.record_word_attempt(uuid, text, boolean) TO authenticated;

GRANT ALL ON FUNCTION public.record_word_attempt(uuid, text, boolean) TO service_role;

CREATE TABLE public.daily_stats (
  id                uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id           uuid                     NOT NULL,
  date              date                     NOT NULL,
  sentences_done    integer                  DEFAULT 0 NOT NULL,
  sentences_correct integer                  DEFAULT 0 NOT NULL,
  rounds_done       integer                  DEFAULT 0 NOT NULL,
  words_seen        integer                  DEFAULT 0 NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.daily_stats
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_stats
  ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);

ALTER TABLE public.daily_stats
  ADD CONSTRAINT daily_stats_user_id_date_key UNIQUE (user_id, date);

ALTER TABLE public.daily_stats
  ADD CONSTRAINT daily_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.daily_stats TO anon;

GRANT ALL ON public.daily_stats TO authenticated;

GRANT ALL ON public.daily_stats TO service_role;

CREATE INDEX daily_stats_user_date_idx ON public.daily_stats (user_id, date DESC);

CREATE TRIGGER daily_stats_updated_at
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY daily_stats_select ON public.daily_stats
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE TABLE public.progress (
  id                      uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id                 uuid                     NOT NULL,
  rounds_completed        integer                  DEFAULT 0 NOT NULL,
  sentences_completed     integer                  DEFAULT 0 NOT NULL,
  current_round_sentences integer                  DEFAULT 0 NOT NULL,
  current_round_number    integer                  DEFAULT 1 NOT NULL,
  rolling_accuracy        numeric(5,2)             DEFAULT 0 NOT NULL,
  updated_at              timestamp with time zone DEFAULT now() NOT NULL,
  streak_days             integer                  DEFAULT 0,
  last_practiced_at       timestamp with time zone,
  longest_streak_days     integer                  DEFAULT 0 NOT NULL,
  last_claimed_round      integer                  DEFAULT 0 NOT NULL
);

ALTER TABLE public.progress
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.progress
  ADD CONSTRAINT progress_pkey PRIMARY KEY (id);

ALTER TABLE public.progress
  ADD CONSTRAINT progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.progress
  ADD CONSTRAINT progress_user_id_key UNIQUE (user_id);

GRANT ALL ON public.progress TO anon;

GRANT ALL ON public.progress TO authenticated;

GRANT ALL ON public.progress TO service_role;

CREATE TRIGGER progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "users can read own progress" ON public.progress
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY "users can update own progress" ON public.progress
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE POLICY progress_insert ON public.progress
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY progress_select ON public.progress
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY progress_update ON public.progress
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE TABLE public.round_summaries (
  id                uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id           uuid                     NOT NULL,
  round_number      integer                  NOT NULL,
  sentences_total   integer                  NOT NULL,
  sentences_correct integer                  NOT NULL,
  accuracy_pct      numeric(5,2)             NOT NULL,
  top_streak        integer                  DEFAULT 0 NOT NULL,
  strictness_used   smallint                 DEFAULT 2 NOT NULL,
  completed_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.round_summaries
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.round_summaries
  ADD CONSTRAINT round_summaries_pkey PRIMARY KEY (id);

ALTER TABLE public.round_summaries
  ADD CONSTRAINT round_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.round_summaries TO anon;

GRANT ALL ON public.round_summaries TO authenticated;

GRANT ALL ON public.round_summaries TO service_role;

CREATE INDEX round_summaries_user_idx ON public.round_summaries (user_id, completed_at DESC);

CREATE POLICY round_summaries_select ON public.round_summaries
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE TABLE public.sentence_attempts (
  id               uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id          uuid                     NOT NULL,
  round_summary_id uuid,
  sentence_zh      text                     NOT NULL,
  sentence_py      text                     NOT NULL,
  user_answer      text                     NOT NULL,
  correct_answer   text                     NOT NULL,
  score            smallint                 NOT NULL,
  correct          boolean                  NOT NULL,
  strictness_used  smallint                 DEFAULT 2 NOT NULL,
  vocab_used       text[]                   DEFAULT '{}'::text[] NOT NULL,
  attempted_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.sentence_attempts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sentence_attempts
  ADD CONSTRAINT sentence_attempts_pkey PRIMARY KEY (id);

ALTER TABLE public.sentence_attempts
  ADD CONSTRAINT sentence_attempts_round_summary_id_fkey FOREIGN KEY (round_summary_id) REFERENCES public.round_summaries(id) ON DELETE SET NULL;

ALTER TABLE public.sentence_attempts
  ADD CONSTRAINT sentence_attempts_score_check CHECK (score >= 0 AND score <= 100);

ALTER TABLE public.sentence_attempts
  ADD CONSTRAINT sentence_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.sentence_attempts TO anon;

GRANT ALL ON public.sentence_attempts TO authenticated;

GRANT ALL ON public.sentence_attempts TO service_role;

CREATE INDEX sentence_attempts_round_idx ON public.sentence_attempts (round_summary_id);

CREATE INDEX sentence_attempts_user_idx ON public.sentence_attempts (user_id, attempted_at DESC);

CREATE POLICY sentence_attempts_select ON public.sentence_attempts
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE TABLE public.settings (
  id                   uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id              uuid                     NOT NULL,
  starting_hsk         smallint                 DEFAULT 1 NOT NULL,
  strictness           smallint                 DEFAULT 2 NOT NULL,
  sentences_per_round  smallint                 DEFAULT 10 NOT NULL,
  rounds_before_unlock smallint                 DEFAULT 3 NOT NULL,
  words_per_unlock     smallint                 DEFAULT 5 NOT NULL,
  show_pinyin          text                     DEFAULT 'tap'::text NOT NULL,
  show_hints           text                     DEFAULT 'after'::text NOT NULL,
  created_at           timestamp with time zone DEFAULT now() NOT NULL,
  updated_at           timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.settings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

ALTER TABLE public.settings
  ADD CONSTRAINT settings_show_hints_check CHECK (show_hints = ANY (ARRAY['before'::text, 'after'::text, 'never'::text]));

ALTER TABLE public.settings
  ADD CONSTRAINT settings_show_pinyin_check CHECK (show_pinyin = ANY (ARRAY['always'::text, 'tap'::text, 'never'::text]));

ALTER TABLE public.settings
  ADD CONSTRAINT settings_starting_hsk_check CHECK (starting_hsk >= 1 AND starting_hsk <= 6);

ALTER TABLE public.settings
  ADD CONSTRAINT settings_strictness_check CHECK (strictness >= 1 AND strictness <= 3);

ALTER TABLE public.settings
  ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);

GRANT ALL ON public.settings TO anon;

GRANT ALL ON public.settings TO authenticated;

GRANT ALL ON public.settings TO service_role;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "users can read own settings" ON public.settings
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY "users can update own settings" ON public.settings
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE POLICY settings_insert ON public.settings
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY settings_select ON public.settings
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY settings_update ON public.settings
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE TABLE public.vocab_list (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id         uuid                     NOT NULL,
  word_zh         text                     NOT NULL,
  pinyin          text                     NOT NULL,
  english         text                     NOT NULL,
  pos             text                     NOT NULL,
  topic           text                     DEFAULT 'general'::text NOT NULL,
  hsk_level       smallint                 NOT NULL,
  unlocked_at     timestamp with time zone DEFAULT now() NOT NULL,
  times_seen      integer                  DEFAULT 0 NOT NULL,
  times_correct   integer                  DEFAULT 0 NOT NULL,
  last_seen_at    timestamp with time zone,
  last_correct_at timestamp with time zone,
  mastery_level   text                     DEFAULT 'learning'::text NOT NULL
);

ALTER TABLE public.vocab_list
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_hsk_level_check CHECK (hsk_level >= 1 AND hsk_level <= 6);

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_mastery_level_check CHECK (mastery_level = ANY (ARRAY['learning'::text, 'reviewing'::text, 'mastered'::text]));

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_pkey PRIMARY KEY (id);

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_pos_check CHECK (pos = ANY (ARRAY['noun'::text, 'verb'::text, 'adjective'::text, 'adverb'::text, 'other'::text]));

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.vocab_list
  ADD CONSTRAINT vocab_list_user_id_word_zh_key UNIQUE (user_id, word_zh);

GRANT ALL ON public.vocab_list TO anon;

GRANT ALL ON public.vocab_list TO authenticated;

GRANT ALL ON public.vocab_list TO service_role;

CREATE INDEX vocab_list_last_seen_idx ON public.vocab_list (user_id, last_seen_at DESC NULLS LAST);

CREATE INDEX idx_vocab_list_user_word ON public.vocab_list (user_id, word_zh);

CREATE INDEX vocab_list_topic_idx ON public.vocab_list (topic);

CREATE INDEX idx_vocab_list_last_seen ON public.vocab_list (user_id, last_seen_at DESC NULLS LAST);

CREATE INDEX vocab_list_pos_idx ON public.vocab_list (pos);

CREATE INDEX vocab_list_hsk_level_idx ON public.vocab_list (hsk_level);

CREATE INDEX vocab_list_user_id_idx ON public.vocab_list (user_id);

CREATE INDEX vocab_list_mastery_idx ON public.vocab_list (user_id, mastery_level);

CREATE POLICY "users can delete own vocab" ON public.vocab_list
  FOR DELETE
  USING ((auth.uid() = user_id));

CREATE POLICY "users can insert own vocab" ON public.vocab_list
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users can read own vocab" ON public.vocab_list
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY "users can update own vocab" ON public.vocab_list
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE POLICY vocab_delete ON public.vocab_list
  FOR DELETE
  USING ((auth.uid() = user_id));

CREATE POLICY vocab_insert ON public.vocab_list
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY vocab_select ON public.vocab_list
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY vocab_update ON public.vocab_list
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE VIEW public.vocab_stats AS SELECT user_id,
    count(*) AS total_words,
    count(*) FILTER (WHERE (times_seen > 0)) AS words_practiced,
    count(*) FILTER (WHERE (mastery_level = 'mastered'::text)) AS words_mastered,
    count(*) FILTER (WHERE (mastery_level = 'reviewing'::text)) AS words_reviewing,
    count(*) FILTER (WHERE (mastery_level = 'learning'::text)) AS words_learning,
    round(avg(
        CASE
            WHEN (times_seen > 0) THEN (((times_correct)::numeric / (times_seen)::numeric) * (100)::numeric)
            ELSE NULL::numeric
        END), 1) AS avg_accuracy_pct,
    sum(times_seen) AS total_attempts
   FROM public.vocab_list
  GROUP BY user_id;

GRANT ALL ON public.vocab_stats TO anon;

GRANT ALL ON public.vocab_stats TO authenticated;

GRANT ALL ON public.vocab_stats TO service_role;
