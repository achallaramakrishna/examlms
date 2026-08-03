# Database operations guide

Reference for running, maintaining, and tuning the ExamLMS Postgres
database in a non-local environment. `schema.sql` and
`backend/src/migrations/1700000001000-InitialSchema.ts` are the source of
truth for structure; this file covers what to do with it once it's running.

---

## Backup and restore

Standard `pg_dump`/`pg_restore` — no ExamLMS-specific tooling needed.

**Full logical backup (recommended for routine backups):**

```bash
pg_dump -Fc -h localhost -U examlms -d examlms -f examlms_$(date +%Y%m%d).dump
```

`-Fc` (custom format) is compressed and supports selective/parallel restore.

**Restore into a fresh database:**

```bash
createdb -h localhost -U examlms examlms_restored
pg_restore -h localhost -U examlms -d examlms_restored examlms_20260101.dump
```

**Restoring pgvector data:** the `vector` extension must exist in the target
database *before* restoring (`pg_restore` will recreate the extension
automatically if the dump includes it, but confirm the target Postgres
image has the pgvector extension available — use the `pgvector/pgvector`
image family, not stock `postgres`).

**Point-in-time recovery:** for production, enable WAL archiving
(`archive_mode = on`) and take periodic base backups with `pg_basebackup`
in addition to logical dumps. Logical dumps alone can't do PITR.

---

## Data retention and cleanup

`audit_logs` grows unbounded and is the main retention concern — it's
written to on every mock test / student answer update or delete via the
trigger. A simple age-based sweep, run on a schedule (cron, or a periodic
job in the app):

```sql
DELETE FROM audit_logs WHERE created_at < now() - interval '180 days';
```

`idx_audit_logs_created_at` (created in the migration) makes this an
index-range delete rather than a full table scan.

For high-volume tables, prefer **archival over deletion** where the data
still has value — see "Data archival" below.

---

## Performance: reading query plans

Always check `EXPLAIN ANALYZE` before assuming a query is slow because of
missing infrastructure rather than a bad query shape.

**Vector similarity search** (the hot path — `services/vectordb/search.ts`):

```sql
EXPLAIN ANALYZE
SELECT q.id, (v.embedding <=> '[0.1, 0.2, ...]'::vector) AS distance
FROM vector_embeddings v
JOIN questions q ON q.id = v.question_id
WHERE NOT q.is_deleted
ORDER BY v.embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

Look for `Index Scan using idx_vector_embeddings_hnsw` in the plan. If you
see `Seq Scan` instead, the HNSW index either wasn't built (check
`\d vector_embeddings` in `psql`) or the planner decided the table is too
small to bother (harmless below a few thousand rows — Postgres is right;
don't force it).

**Question lookup by subject/topic:**

```sql
EXPLAIN ANALYZE
SELECT * FROM questions WHERE subject_id = '...' AND topic_id = '...' AND NOT is_deleted;
```

Should use `idx_questions_subject_topic`. If a query instead filters mostly
by `is_deleted`, consider a partial index (`WHERE NOT is_deleted`) — the
same pattern already used on `exams.exam_type`.

**Full-text search:**

```sql
EXPLAIN ANALYZE
SELECT * FROM questions
WHERE to_tsvector('english', question_text) @@ to_tsquery('english', 'kinematics & velocity');
```

Should hit `idx_questions_text_fts` (GIN). If the query instead uses
`ILIKE '%...%'`, it won't use this index — `pg_trgm` (already enabled) with
a trigram GIN index is the fix for arbitrary substring search instead of
term search.

---

## Query cost optimization tips

- **Avoid `SELECT *` on `questions`** in hot paths — `options` and
  `question_text` are the widest columns; select only what you need.
- **Batch embedding lookups.** `vectordb/scripts/create-embeddings.ts`
  processes one question at a time deliberately (to respect OpenAI rate
  limits) — don't parallelize it without a concurrency limiter.
- **The HNSW index trades recall for speed.** Default `m`/`ef_construction`
  are fine at this dataset size (hundreds to low thousands of questions).
  If you seed hundreds of thousands of questions, tune per pgvector's docs
  and re-run `npm run index -- reindex` in `vectordb/`.
- **`student_dashboard_summary` is precomputed** specifically so the
  manager/student dashboard never runs the underlying aggregate query live
  — don't be tempted to query `mock_tests`/`student_answers` directly for
  dashboard reads once this view exists.
- **Watch for N+1s in TypeORM relations.** `getMetrics` and `getExam`
  eager-load `relations: [...]` deliberately for this reason — if you add
  a new endpoint that loops and queries per-row, use `relations` or a
  single joined raw query instead.

---

## Index statistics and maintenance

Check index usage periodically — an unused index is pure write overhead:

```sql
SELECT relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

An index with `idx_scan = 0` after a representative production period is a
candidate for removal (or your query patterns don't match what you
expected — check the queries first).

Rebuild a bloated or bulk-load-affected index:

```sql
REINDEX INDEX idx_vector_embeddings_hnsw;
```

(`vectordb/scripts/index-management.ts reindex` does exactly this via CLI.)

Update planner statistics after a large bulk load (the seed script inserts
120 rows — analyze isn't critical there, but *is* important after a
multi-thousand-row `ingest`):

```sql
ANALYZE questions;
ANALYZE vector_embeddings;
```

---

## Soft delete

`questions` and `exams` use a boolean `is_deleted` flag rather than
TypeORM's `@DeleteDateColumn` (which `users` uses instead, via
`deleted_at`) — two different patterns, chosen deliberately:

- `users.deleted_at` uses `@DeleteDateColumn` because TypeORM's
  `softDelete()`/`.find()` machinery transparently excludes soft-deleted
  users everywhere, which is what you want for an account.
- `questions`/`exams` use a plain boolean because they're referenced from
  many places (mock tests, performance metrics, audit logs) where you
  often *do* want to see historical soft-deleted rows in joins (e.g. a
  completed mock test should still show which questions were asked, even
  if a question was later retired) — TypeORM's automatic exclusion would
  fight that.

SQL-level helpers (see `schema.sql` / the migration):

```sql
SELECT soft_delete_question('question-uuid-here');
SELECT soft_delete_exam('exam-uuid-here');
```

Application code should filter `WHERE NOT is_deleted` explicitly — see
`examController.ts` and `questionController.ts` for the pattern.

---

## JSON field shapes

Reference for the `jsonb` columns, since Postgres won't enforce their
internal structure:

**`questions.options`** — `QuestionOption[]`
```json
[{ "label": "A", "text": "..." }, { "label": "B", "text": "..." }]
```

**`student_profiles.strengths` / `.weaknesses`** — `string[]` (subject or
topic ids, or names for older/manually-entered data)
```json
["Kinematics", "Thermodynamics"]
```

**`mock_tests`** no longer has a JSON answers blob — see `student_answers`
(one normalized row per question attempt) instead.

**`study_plans.plan`** — `StudyPlanContent` (see `models/StudyPlan.ts`)
```json
{
  "weeklyFocus": [{ "week": 1, "topics": ["Kinematics"], "goal": "Build a strong foundation in mechanics" }],
  "dailyHours": 3,
  "notes": "Focus on numericals in week 1."
}
```

**`student_doubts.related_question_ids`** — `string[]` (question uuids the
RAG retriever surfaced as context for the answer)
```json
["a1b2c3...", "d4e5f6..."]
```

**`audit_logs.old_value` / `.new_value`** — full row snapshot (`to_jsonb(OLD)`
/ `to_jsonb(NEW)`) as captured by the trigger; shape matches whatever
table triggered the log entry.

---

## Audit logging

Two complementary mechanisms, not one:

1. **DB trigger** (`audit_trigger_fn`, wired to `mock_tests` and
   `student_answers` in the migration) — catches every UPDATE/DELETE
   regardless of which code path made the change, including manual `psql`
   edits. Extend to another table with:

   ```sql
   CREATE TRIGGER trg_audit_<table_name>
     AFTER UPDATE OR DELETE ON <table_name>
     FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
   ```

2. **App-level logging** — for actions with no natural row to trigger off
   (e.g. `login`), insert into `audit_logs` directly from the controller.
   There's no dedicated helper yet; follow the `AuditLog` entity's shape.

The trigger only fires on UPDATE/DELETE, not INSERT — creation events are
expected to be self-evident from the row's own `created_at`, and logging
every INSERT would roughly double write volume on high-traffic tables for
low value. Add `AFTER INSERT` to the trigger definition if you need it.

---

## Materialized view refresh

`student_dashboard_summary` is not automatically refreshed — Postgres
materialized views never are. Options, roughly in order of operational
complexity:

**Manual/cron (simplest, fine for Phase 1):**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY student_dashboard_summary;
```
`CONCURRENTLY` avoids locking the view for reads during refresh — it
requires the unique index the migration already creates
(`idx_student_dashboard_summary_student_id`). Schedule this every 5–15
minutes via cron or a scheduled job; dashboard staleness of that order is
usually acceptable.

**Trigger-based (near-real-time, more write overhead):** add a trigger on
`mock_tests`/`student_answers` that refreshes the view after each
completed test. Only worth it if users expect the dashboard to update
within seconds of finishing a test — weigh against the refresh cost
scaling with total student count.

---

## Migration rollback

Every migration in this project implements both `up()` and `down()`.
Roll back the most recent migration:

```bash
cd backend
npm run migration:revert
```

This runs `InitialSchema.down()`, which drops tables in reverse dependency
order (audit_logs → performance_metrics → ... → users), plus the
materialized view, triggers, and functions. **This is destructive** — there
is no way to revert a migration without losing the data in the tables it
created. Always take a backup (see above) before reverting in any
environment with real data.

For a schema *change* (not a full revert), never edit
`1700000001000-InitialSchema.ts` after it has run anywhere outside your
own machine — write a new migration file instead, following the same
`up()`/`down()` pattern, and update `schema.sql` to match.

---

## Data archival

For tables that grow large but whose old rows are rarely queried
(`audit_logs` is the primary candidate; `student_answers` and
`performance_metrics` may become candidates at scale):

1. Create an `_archive` table with the same shape:
   ```sql
   CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);
   ```
2. Move (not copy) old rows in a transaction:
   ```sql
   BEGIN;
   INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < now() - interval '1 year';
   DELETE FROM audit_logs WHERE created_at < now() - interval '1 year';
   COMMIT;
   ```
3. Archive tables can live in the same database (simplest) or be dumped out
   to cold storage via `pg_dump -t audit_logs_archive` and dropped locally
   once confirmed durable elsewhere.

Do this in batches (e.g. `LIMIT 10000` in a loop) for large tables to avoid
long-held locks and huge transactions.

---

## Setup and running instructions

See the root `README.md` "Getting started" section for the full setup flow
(env files, `docker-compose up`, running the migration, seeding). Quick
reference for direct `psql` access once the stack is up:

```bash
docker exec -it examlms-postgres psql -U examlms -d examlms
```

Useful checks once connected:

```sql
\dx                              -- confirm vector, pgcrypto, pg_trgm extensions are installed
\d vector_embeddings              -- confirm the HNSW index exists
SELECT count(*) FROM questions;   -- confirm seed data loaded
```
