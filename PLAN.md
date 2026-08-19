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

## Step 0 — measure first, before building anything

Do **not** start this on a total-row-count trigger — total rows spread across ~1,050 seeded
sentences × 3 strictness levels tells you almost nothing. What matters is concentration: how many
attempts land on the *same* `(sentence_zh, strictness_used)` bucket, since that's the granularity
the cache matches on. `selectStaticSentence` (`src/lib/staticSentences.ts`) narrows to the top-5
lowest-accuracy candidates among a user's *unlocked* vocab, and early on that vocab is small (20
words at signup), so traffic concentrates onto a small set of easy/common sentences before vocab
has grown out — expect a Zipfian pileup on a handful of sentences well before the corpus as a
whole has meaningful volume.

Run this (static mode only — that's the mode this cache protects financially; AI-mode sentences
are per-user generated and won't repeat across users at all):

```sql
select sentence_zh, strictness_used, count(*) as attempts,
       count(distinct user_answer_normalized) as distinct_answers
from sentence_attempts
group by sentence_zh, strictness_used
order by attempts desc
limit 30;
```

`attempts / distinct_answers` on the top rows is a direct read on the exact-match cache's real hit
rate where it matters most. Eyeball the `distinct_answers` for a top bucket — if most of them look
like genuine near-duplicates a human would call "the same answer" (not just typos, which exact-match
already catches), that's the signal semantic matching would help. As an order-of-magnitude starting
point: check in once you're around a few hundred total static-mode grade attempts — that's roughly
when the top few sentences should have accumulated double digits of repeat attempts, enough to read
something from the ratio instead of noise. If the top buckets' near-duplicate rate is low, skip this
feature — it isn't worth the added cost/complexity/risk.

## If the data justifies building it

1. **Enable `pgvector`** on the Supabase project (`CREATE EXTENSION IF NOT EXISTS vector;`).
2. **Add an embedding column** to `sentence_attempts`, e.g. `user_answer_embedding vector(N)`
   (dimension depends on the embedding model chosen), populated at insert time in
   `src/app/api/grade/route.ts` alongside the existing `insertAttempt` write.
3. **Call an embedding API** for the incoming answer before the cache lookup (cheap/fast relative
   to a grading call, but it's a real added cost+latency on every grade request — factor that in).
4. **Replace (or supplement) the exact-match RPC** with a similarity query: still filter on
   `sentence_zh = ... AND strictness_used = ...` (those must still match exactly — only the answer
   comparison becomes fuzzy), then order by cosine distance to the new answer's embedding
   (`<=>` operator with an `ivfflat` or `hnsw` index) and only accept a match above a conservative
   threshold. Start the threshold high (few false positives) and only loosen it based on observed
   accuracy — don't guess a number up front.
5. **No backfill needed for old rows** — same pattern as `feedback`: only rows with an embedding
   populated are eligible matches, historical rows just never match until re-graded (fine).
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
- Whether to keep exact-match as a fast-path before falling through to the embedding lookup
  (probably yes — it's free and zero-risk, only pay for an embedding call on an exact-match miss).
