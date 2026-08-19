# Future: semantic (embeddings) matching for the grade cache

Status: **not started**. Written 2026-08-19 as a placeholder so this isn't forgotten once
there's enough real usage to justify it.

## Context

`/api/grade` already has an exact-match cache (`supabase/migrations/20260819000000_add_grade_cache.sql`,
`find_cached_grade` RPC, wired into `src/app/api/grade/route.ts`). It matches on
`(sentence_zh, strictness_used, normalize_answer(user_answer))`, where `normalize_answer` just
lowercases/trims/collapses whitespace — a cache hit only ever fires for text that's byte-identical
after that normalization, so it has **zero risk of serving a wrong grade**. It misses true
paraphrases ("I want to buy this book" vs "I'd like to buy this book").

We discussed extending this to fuzzy/character-similarity matching (edit distance, trigram
similarity, a "70% similar" threshold) and **rejected it**: string-similarity metrics can't tell a
paraphrase from a meaning-flipping edit. "I don't like apples" vs "I do like apples" score as
highly similar by edit distance despite being opposite in meaning — the same mechanism that would
catch "buy" ≈ "purchase" also catches "don't" ≈ "do", so there's no threshold that gets the gain
without the risk. Not worth the correctness regression for a grading feature.

Embeddings are the sound version of the same idea: they're trained to place semantically different
sentences far apart even when textually close (so negation pairs score *less* similar, not more),
so cosine similarity on embeddings is a meaningfully better signal for "does this mean the same
thing" than any character-level metric. Still not perfect — don't treat it as risk-free.

Before ever serving a semantic-match cache hit to a real user: build a small labeled evaluation set
spanning the failure modes that actually matter here — negation ("I like it" / "I don't like it"),
entity substitution ("I bought an apple" / "I bought a pear"), scope/quantifier differences ("I want
all of them" / "I want some of them"), and genuine valid paraphrases (the true positives this
feature exists to catch) — and run the matcher in shadow mode first: compute what it *would* have
returned against real production traffic, log it, but keep serving the real Anthropic grade
regardless, so false positives can be measured against ground truth before anything is ever actually
served from cache. Pick a concrete false-positive-rate threshold below which this is worth shipping,
and a rollback trigger if live false positives exceed it after launch — don't ship on vibes just
because the offline number looked reasonable.

## Step 0 — measure first, before building anything

Do **not** start this on a total-row-count trigger — total rows spread across ~1,050 seeded
sentences × 3 strictness levels tells you almost nothing. What matters is concentration: how many
attempts land on the *same* `(sentence_zh, strictness_used)` bucket, since that's the granularity
the cache matches on. `selectStaticSentence` (`src/lib/staticSentences.ts`) narrows to the top-5
lowest-accuracy candidates among a user's *unlocked* vocab, and early on that vocab is small (20
words at signup), so traffic concentrates onto a small set of easy/common sentences before vocab
has grown out — expect a Zipfian pileup on a handful of sentences well before the corpus as a
whole has meaningful volume.

Run this. `sentence_attempts` has no `practice_mode` column, so this can't filter on mode directly
— joining against `sentence_bank.sentence_zh` approximates "static-sourced" without a schema change
(imperfect: a coincidentally-identical AI-generated sentence would also match, but that's rare and
this is a one-off diagnostic, not something that needs to be exact). Also restricted to
`feedback IS NOT NULL`, matching `find_cached_grade`'s actual eligibility — pre-migration rows
without feedback were never real cache candidates and would otherwise inflate the counts:

```sql
select sa.sentence_zh, sa.strictness_used, count(*) as attempts,
       count(distinct sa.user_answer_normalized) as distinct_answers
from sentence_attempts sa
where sa.feedback is not null
  and sa.sentence_zh in (select sentence_zh from sentence_bank)
group by sa.sentence_zh, sa.strictness_used
order by attempts desc
limit 30;
```

This is a repetition metric, not a directly-measured hit rate — no hit/miss instrumentation exists
in `grade/route.ts` today. `(attempts - distinct_answers) / attempts` on the top rows is a closer
proxy for what the exact-match cache's actual hit rate would look like (bounded 0–1: the fraction of
attempts that repeat an already-seen normalized answer for that bucket), but treat it as an
approximation, not a measured number. Eyeball the `distinct_answers` for a top bucket — if most of
them look like genuine near-duplicates a human would call "the same answer" (not just typos, which
exact-match already catches), that's the signal semantic matching would help. As an
order-of-magnitude starting point: check in once you're around a few hundred total static-mode grade
attempts — that's roughly when the top few sentences should have accumulated double digits of repeat
attempts, enough to read something from the ratio instead of noise. If the top buckets'
near-duplicate rate is low, skip this feature — it isn't worth the added cost/complexity/risk.

## If the data justifies building it

1. **Enable `pgvector`** on the Supabase project (`CREATE EXTENSION IF NOT EXISTS vector;`).
2. **Add an embedding column** to `sentence_attempts`, e.g. `user_answer_embedding vector(N)`
   (dimension depends on the embedding model chosen), plus a `user_answer_embedding_model text`
   column recording which embedding model/version produced it — both populated together at insert
   time in `src/app/api/grade/route.ts` alongside the existing `insertAttempt` write. Vectors from
   different models/versions aren't comparable; this column is what lets a future model swap
   coexist with old data instead of silently corrupting similarity results.
3. **Only call the embedding API on an exact-match miss** — keep `find_cached_grade`'s existing
   exact-match lookup as the free first-pass fast path, unchanged. Only generate an embedding for
   the incoming answer (cheap/fast relative to a grading call, but still a real added cost+latency)
   when that lookup returns nothing. Never spend an embedding call on a request the exact-match
   cache already resolved.
4. **Add a second, semantic-match RPC that runs only after an exact-match miss**: filter on
   `sentence_zh = ... AND strictness_used = ... AND feedback IS NOT NULL AND
   user_answer_embedding_model = <the model that produced the incoming answer's embedding>` (those
   must still match exactly, the eligibility guard stays the same as `find_cached_grade` — only a
   row with a complete grading result can ever be replayed — and the model-version guard keeps
   comparisons confined to a single embedding space; only the answer comparison becomes fuzzy),
   then order by cosine distance to the new answer's embedding (`<=>` operator with an `ivfflat` or
   `hnsw` index) and only accept a match above a conservative threshold. Return the same
   derived-field-only projection as `find_cached_grade` (`score, correct_answer, feedback` — never
   `user_id` or another user's raw answer text). Start the threshold high (few false positives) and
   only loosen it based on observed accuracy — don't guess a number up front. Only fall through to
   the real Anthropic grading call if this also misses.
5. **No backfill needed for old rows** — same pattern as `feedback`: only rows with an embedding
   populated *and* matching the current embedding model version are eligible matches. Historical
   rows, and rows from a prior model version after any future model swap, just never match until
   re-graded (fine) — existing populated vectors are never deleted or rewritten, just naturally
   excluded from matching a different model's queries.
6. **Mirror the existing `find_cached_grade` SECURITY DEFINER pattern** (see
   `supabase/migrations/20260806171015_drop_p_user_id_use_auth_uid.sql` for the REVOKE/GRANT
   convention this project requires on every new function) rather than inventing a new access
   pattern.

## Open questions to resolve when this is picked up

- Which embedding provider/model, and what's the actual per-call cost at expected volume — needs
  to stay well below the cost of the Anthropic grading call it's trying to avoid, or the whole
  feature is pointless.
- What similarity threshold actually holds up — needs eyeballing real (sentence, candidate-match)
  pairs near the cutoff, not a number picked in the abstract.
