# ExamLMS

A learning management system for NEET/KCET competitive exam preparation,
with an AI-powered study advisor, doubt resolver, and study planner built
on LangChain + RAG over a vector store of practice questions.

This is the **Phase 1 (Platform Architecture)** scaffold: project structure,
infrastructure wiring, a full 14-table data model, and a working (but
minimally-featured) end-to-end flow. It is not a finished product.

## Architecture

- **Backend**: Express.js + TypeScript, PostgreSQL (via TypeORM) for all
  structured data, Redis + Bull for background job processing (embedding
  generation, bulk ingestion).
- **AI**: LangChain orchestrates three agents — a doubt resolver (RAG over
  indexed questions), a study planner, and a performance advisor — all
  backed by OpenAI models.
- **Frontend**: React + TypeScript (Vite), talking to the backend over a
  `/api` proxy in dev.
- **Vector store**: pgvector, as a Postgres extension — no separate vector
  database service. Embeddings are generated explicitly through OpenAI (via
  LangChain) and stored in the `vector_embeddings` table, searched via
  pgvector's `<=>` cosine-distance operator behind an HNSW index. One
  database to run and back up, instead of two.

```
/backend      Express API, TypeORM entities, RAG/agent services, migrations
/frontend     React app (pages, components, hooks, services)
/vectordb     Standalone scripts for seeding/ingesting questions and
              managing the pgvector index, independent of the running backend
/schema.sql   Human-readable reference copy of the full DB schema — see
              backend/src/migrations for the applied version
/DATABASE.md  Operations guide: backup/restore, retention, performance
              tuning, rollback, archival
```

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for Postgres with pgvector, and Redis)
- An OpenAI API key (for embeddings and the LLM-backed agents)

## Getting started

1. Copy environment files and fill in `OPENAI_API_KEY` at minimum:

   ```
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp vectordb/.env.example vectordb/.env
   ```

2. Start the infrastructure + apps:

   ```
   docker-compose up -d
   ```

   This brings up Postgres with pgvector pre-installed (`localhost:5432`),
   Redis (`localhost:6379`), the backend (`localhost:4000`), and the
   frontend (`localhost:5173`).

3. Run the initial migration (creates all 14 tables, the pgvector/pg_trgm
   extensions, the HNSW index, the audit trigger, and the dashboard
   materialized view):

   ```
   cd backend
   npm run migration:run
   ```

4. Seed the practice question bank — 3 subjects (Physics/Chemistry/Biology),
   30 chapters, and 120 original practice questions, each embedded and
   indexed into pgvector:

   ```
   cd vectordb
   npm install
   npm run seed
   ```

5. Register a user and log in via the frontend at `http://localhost:5173`,
   or directly against the API:

   ```
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"changeme","fullName":"Your Name"}'
   ```

## Local development without Docker

Each of `backend/`, `frontend/`, and `vectordb/` is a standalone npm
package. You can run `npm install && npm run dev` in `backend/` and
`frontend/` directly against a locally-running Postgres (with the pgvector
extension available) and Redis, if you'd rather not use Docker for the app
containers.

## Data model

14 tables — see `schema.sql` for the full DDL:

`users`, `subjects`, `topic_hierarchy` (self-referential chapter → topic
tree), `exams`, `questions`, `vector_embeddings` (pgvector), `student_profiles`,
`mock_tests`, `student_answers` (normalized per-question attempt),
`student_reviews` (bookmarks/notes), `student_doubts` (persisted AI Q&A
history), `study_plans` (persisted AI-generated plans), `performance_metrics`,
`audit_logs`.

Operational concerns — backups, retention, the audit trigger, the
`student_dashboard_summary` materialized view, soft-delete helpers, and
query performance tuning — are documented in `DATABASE.md`.

## What's implemented vs. stubbed

**Implemented and working:**
- Registration/login (JWT) and Google OAuth wiring
- Full 14-table schema + migration, matching `schema.sql`
- Mock test attempt flow (start → answer → submit), scored per-subject via
  normalized `student_answers` rows
- Question embedding + pgvector indexing on create, and via the standalone
  `vectordb` scripts (`seed`, `ingest`, `embed`, `index`)
- RAG-grounded doubt resolution (`POST /api/ai/doubt`), persisted to
  `student_doubts`
- Semantic question search (`GET /api/ai/search`)
- LLM-generated study plans (persisted to `study_plans`) and
  performance-based advisor recommendations

**Dependency note:** the original spec called for the `langchain` package,
but installing it directly pulled in unrelated peer packages
(`@langchain/anthropic`, `@langchain/aws`, etc.) pinned to an incompatible
`@langchain/core` major version, breaking `npm install`. Nothing in this
scaffold actually imports from the `langchain` umbrella package —
`ChatOpenAI`, `OpenAIEmbeddings`, `ChatPromptTemplate`, and
`StringOutputParser` all come from `@langchain/core` and `@langchain/openai`,
installed directly and pinned to compatible versions.

**Intentionally minimal (Phase 1 is infrastructure, not full UX):**
- Frontend pages are functional but not styled/polished
- No admin UI for creating exams/questions/topics — use the API directly for now
- Mock-test questions are returned to the client with `correctOption`
  included — fine for this scaffold, but a real exam UI must strip that
  field server-side before the test is submitted
- No PDF-to-question extraction pipeline yet (`pdf-parse` is installed but
  not wired to a route — see `backend/src/controllers/questionController.ts`
  for where `bulkImportQuestions` would plug in a parser)
- Bull queue (`ingestionQueue`, `embeddingQueue` in `backend/src/config/queue.ts`)
  has no worker process yet; jobs are enqueued but nothing consumes them
- The audit trigger is wired to `mock_tests` and `student_answers` only —
  extend it to other tables following the same pattern in the migration

## Vector store scripts (`/vectordb`)

Standalone from the backend on purpose — these are meant to run as one-off
CLI tasks (data loading, reindexing), not as part of the request/response
cycle.

- `npm run seed` — seeds subjects, chapters, and 120 practice questions,
  embedding and indexing each one
- `npm run ingest -- path/to/questions.json` — bulk-load your own questions
  into Postgres and index them into pgvector
- `npm run embed` — re-embed any Postgres question missing a `vector_embeddings` row
- `npm run index -- <status|reindex>` — inspect or rebuild the pgvector HNSW index
