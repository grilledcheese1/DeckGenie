# Supabase schema workflow

This project's database schema (tables, RLS policies, functions) is version-controlled
here instead of living only in the Supabase dashboard.

- `schema.sql` — a point-in-time reference dump of the full `public` schema
  (`supabase db dump --schema public`). It is **not** a source of truth and is not
  hand-edited — regenerate it any time you want an up-to-date snapshot to read or diff.
- `migrations/` — the **source of truth** going forward. Every schema change should be
  a migration file here, reviewed like any other code change.

## Making a schema change

1. Create a new migration file:
   ```
   npx supabase migration new <short_description>
   ```
   This creates `supabase/migrations/<timestamp>_<short_description>.sql`.

2. Write the DDL (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, etc.)
   in that file by hand, or generate it by making the change in a local/staging database and running
   `npx supabase db diff -f <short_description>`.

3. Apply it to the linked remote project:
   ```
   npx supabase db push
   ```
   (Requires Docker running and the project linked — see below.)

4. Commit the migration file. Do not edit a migration file after it has been pushed/committed —
   write a new migration to change course instead.

## One-time setup (already done for this repo)

```
npx supabase login          # interactive browser auth
npx supabase link --project-ref xuzsytkftyqakrhqxttw
```

## Refreshing the reference dump

```
npx supabase db dump --schema public -f supabase/schema.sql
```

Requires Docker Desktop running locally (the CLI runs `pg_dump` inside a matching
Postgres container to talk to the remote database).
