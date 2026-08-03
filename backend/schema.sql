-- ExamLMS database schema — NEET/KCET competitive exam prep
-- Reference DDL. The authoritative, applied version of this schema lives in
-- src/migrations/1700000001000-InitialSchema.ts — keep the two in sync.
--
-- Requires PostgreSQL >= 14 with the "vector" (pgvector) extension available.
-- The docker-compose.yml postgres service uses the pgvector/pgvector:pg16 image,
-- which ships the extension pre-built.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector: embedding columns + similarity search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram support, speeds up ILIKE search as a GIN fallback

-- =========================================================================
-- 1. users
-- =========================================================================
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          varchar NOT NULL UNIQUE,
  password_hash  varchar,
  oauth_provider varchar,
  oauth_id       varchar,
  full_name      varchar NOT NULL,
  role           varchar NOT NULL DEFAULT 'student', -- 'student' | 'admin'
  is_active      boolean NOT NULL DEFAULT true,
  deleted_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 2. subjects
-- =========================================================================
CREATE TABLE subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar NOT NULL UNIQUE,  -- 'Physics', 'Chemistry', 'Biology'
  code        varchar NOT NULL UNIQUE,  -- 'PHY', 'CHEM', 'BIO'
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 3. topic_hierarchy — self-referential chapter -> topic -> sub-topic tree
-- =========================================================================
CREATE TABLE topic_hierarchy (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES topic_hierarchy(id) ON DELETE CASCADE,
  name        varchar NOT NULL,
  level       int NOT NULL DEFAULT 0, -- 0 = chapter, 1 = topic, 2 = sub-topic, ...
  order_index int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topic_hierarchy_subject_id ON topic_hierarchy (subject_id);
CREATE INDEX idx_topic_hierarchy_parent_id ON topic_hierarchy (parent_id);

-- =========================================================================
-- 4. exams
-- =========================================================================
CREATE TABLE exams (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             varchar NOT NULL,
  exam_type        varchar NOT NULL, -- 'NEET' | 'KCET'
  description      text,
  total_questions  int NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 180,
  is_deleted       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exams_exam_type ON exams (exam_type) WHERE NOT is_deleted;

-- =========================================================================
-- 5. questions
-- =========================================================================
CREATE TABLE questions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id        uuid NOT NULL REFERENCES subjects(id),
  topic_id          uuid REFERENCES topic_hierarchy(id),
  question_text     text NOT NULL,
  question_image_url varchar,
  options           jsonb NOT NULL, -- [{ "label": "A", "text": "..." }, ...]
  correct_option    varchar NOT NULL,
  explanation       text,
  difficulty        varchar NOT NULL DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  source            varchar,
  previous_year     int, -- e.g. 2023, for past-year NEET/KCET questions
  is_deleted        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_exam_id ON questions (exam_id);
CREATE INDEX idx_questions_subject_topic ON questions (subject_id, topic_id);
-- Full-text search over question text (deliverable: GIN full-text index)
CREATE INDEX idx_questions_text_fts ON questions USING GIN (to_tsvector('english', question_text));

-- =========================================================================
-- 6. vector_embeddings — one current embedding per question (pgvector)
-- =========================================================================
CREATE TABLE vector_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL, -- text-embedding-3-small output width
  model_name  varchar NOT NULL DEFAULT 'text-embedding-3-small',
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- HNSW index for fast approximate cosine-similarity search (pgvector >= 0.5)
CREATE INDEX idx_vector_embeddings_hnsw
  ON vector_embeddings USING hnsw (embedding vector_cosine_ops);

-- =========================================================================
-- 7. student_profiles
-- =========================================================================
CREATE TABLE student_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  target_exam_type     varchar, -- 'NEET' | 'KCET'
  target_exam_date     date,
  study_hours_per_day  int,
  strengths            jsonb NOT NULL DEFAULT '[]',
  weaknesses           jsonb NOT NULL DEFAULT '[]',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 8. mock_tests
-- =========================================================================
CREATE TABLE mock_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  exam_id      uuid NOT NULL REFERENCES exams(id),
  started_at   timestamptz NOT NULL,
  completed_at timestamptz,
  total_score  numeric,
  max_score    numeric NOT NULL,
  status       varchar NOT NULL DEFAULT 'in_progress', -- in_progress | completed | abandoned
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_tests_student_id ON mock_tests (student_id);

-- =========================================================================
-- 9. student_answers — one row per question attempted in a mock test
-- =========================================================================
CREATE TABLE student_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_test_id    uuid NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES questions(id),
  selected_option varchar, -- null = skipped
  is_correct      boolean,
  time_taken_sec  int,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mock_test_id, question_id)
);
CREATE INDEX idx_student_answers_mock_test_id ON student_answers (mock_test_id);

-- =========================================================================
-- 10. student_reviews — bookmarks / personal notes on a question
-- =========================================================================
CREATE TABLE student_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_bookmarked boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id)
);

-- =========================================================================
-- 11. student_doubts — persisted AI doubt-resolution history (RAG Q&A log)
-- =========================================================================
CREATE TABLE student_doubts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  question_id         uuid REFERENCES questions(id),
  doubt_text          text NOT NULL,
  answer_text         text,
  related_question_ids jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_doubts_student_id ON student_doubts (student_id);

-- =========================================================================
-- 12. study_plans — persisted, AI-generated study plans
-- =========================================================================
CREATE TABLE study_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  target_exam_id uuid REFERENCES exams(id),
  plan           jsonb NOT NULL, -- { weeklyFocus: [...], dailyHours, notes }
  generated_at   timestamptz NOT NULL DEFAULT now(),
  is_active      boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_study_plans_student_active ON study_plans (student_id, is_active);

-- =========================================================================
-- 13. performance_metrics
-- =========================================================================
CREATE TABLE performance_metrics (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                 uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  mock_test_id               uuid REFERENCES mock_tests(id) ON DELETE CASCADE,
  subject_id                 uuid REFERENCES subjects(id),
  topic_id                   uuid REFERENCES topic_hierarchy(id),
  accuracy_percent           numeric NOT NULL,
  avg_time_per_question_sec  numeric,
  questions_attempted        int NOT NULL,
  questions_correct          int NOT NULL,
  recorded_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_performance_metrics_student_id ON performance_metrics (student_id);

-- =========================================================================
-- 14. audit_logs — generic audit trail (populated by app code + triggers)
-- =========================================================================
CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action      varchar NOT NULL,      -- 'create' | 'update' | 'delete' | 'login' | ...
  entity_type varchar NOT NULL,      -- 'question' | 'mock_test' | ...
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  varchar,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at); -- for retention/archival sweeps

-- =========================================================================
-- Soft-delete helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION soft_delete_question(q_id uuid) RETURNS void AS $$
  UPDATE questions SET is_deleted = true, updated_at = now() WHERE id = q_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION soft_delete_exam(e_id uuid) RETURNS void AS $$
  UPDATE exams SET is_deleted = true, updated_at = now() WHERE id = e_id;
$$ LANGUAGE sql;

-- =========================================================================
-- Audit trigger — example wired to mock_tests and student_answers.
-- Extend to other tables by adding the same CREATE TRIGGER block.
-- =========================================================================
CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, old_value, new_value)
  VALUES (
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_mock_tests
  AFTER UPDATE OR DELETE ON mock_tests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER trg_audit_student_answers
  AFTER UPDATE OR DELETE ON student_answers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- =========================================================================
-- Materialized view — per-student dashboard summary
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY student_dashboard_summary;
-- (CONCURRENTLY requires the unique index below; see DATABASE.md for the
-- refresh schedule recommendation.)
-- =========================================================================
CREATE MATERIALIZED VIEW student_dashboard_summary AS
SELECT
  sp.id AS student_id,
  u.full_name,
  count(DISTINCT mt.id) AS total_mock_tests,
  count(DISTINCT mt.id) FILTER (WHERE mt.status = 'completed') AS completed_mock_tests,
  COALESCE(avg(mt.total_score / NULLIF(mt.max_score, 0)) FILTER (WHERE mt.status = 'completed'), 0) * 100 AS avg_score_percent,
  count(sa.id) AS total_questions_attempted,
  count(sa.id) FILTER (WHERE sa.is_correct) AS total_questions_correct,
  max(mt.completed_at) AS last_test_completed_at
FROM student_profiles sp
JOIN users u ON u.id = sp.user_id
LEFT JOIN mock_tests mt ON mt.student_id = sp.id
LEFT JOIN student_answers sa ON sa.mock_test_id = mt.id
GROUP BY sp.id, u.full_name;

CREATE UNIQUE INDEX idx_student_dashboard_summary_student_id
  ON student_dashboard_summary (student_id);
