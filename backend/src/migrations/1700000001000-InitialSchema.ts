import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full NEET/KCET schema — 14 tables, pgvector, full-text search, an audit
 * trigger, and a dashboard materialized view. Kept in sync with schema.sql
 * at the repo root; that file is the human-readable reference copy.
 */
export class InitialSchema1700000001000 implements MigrationInterface {
  name = 'InitialSchema1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // 1. users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar,
        "oauth_provider" varchar,
        "oauth_id" varchar,
        "full_name" varchar NOT NULL,
        "role" varchar NOT NULL DEFAULT 'student',
        "is_active" boolean NOT NULL DEFAULT true,
        "deleted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 2. subjects
    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE,
        "code" varchar NOT NULL UNIQUE,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 3. topic_hierarchy
    await queryRunner.query(`
      CREATE TABLE "topic_hierarchy" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "parent_id" uuid REFERENCES "topic_hierarchy"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "level" int NOT NULL DEFAULT 0,
        "order_index" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_topic_hierarchy_subject_id" ON "topic_hierarchy" ("subject_id")`);
    await queryRunner.query(`CREATE INDEX "idx_topic_hierarchy_parent_id" ON "topic_hierarchy" ("parent_id")`);

    // 4. exams
    await queryRunner.query(`
      CREATE TABLE "exams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "exam_type" varchar NOT NULL,
        "description" text,
        "total_questions" int NOT NULL DEFAULT 0,
        "duration_minutes" int NOT NULL DEFAULT 180,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_exams_exam_type" ON "exams" ("exam_type") WHERE NOT is_deleted`);

    // 5. questions
    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id"),
        "topic_id" uuid REFERENCES "topic_hierarchy"("id"),
        "question_text" text NOT NULL,
        "question_image_url" varchar,
        "options" jsonb NOT NULL,
        "correct_option" varchar NOT NULL,
        "explanation" text,
        "difficulty" varchar NOT NULL DEFAULT 'medium',
        "source" varchar,
        "previous_year" int,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_questions_exam_id" ON "questions" ("exam_id")`);
    await queryRunner.query(`CREATE INDEX "idx_questions_subject_topic" ON "questions" ("subject_id", "topic_id")`);
    await queryRunner.query(`
      CREATE INDEX "idx_questions_text_fts" ON "questions" USING GIN (to_tsvector('english', question_text))
    `);

    // 6. vector_embeddings (pgvector)
    await queryRunner.query(`
      CREATE TABLE "vector_embeddings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL UNIQUE REFERENCES "questions"("id") ON DELETE CASCADE,
        "embedding" vector(1536) NOT NULL,
        "model_name" varchar NOT NULL DEFAULT 'text-embedding-3-small',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vector_embeddings_hnsw" ON "vector_embeddings" USING hnsw (embedding vector_cosine_ops)
    `);

    // 7. student_profiles
    await queryRunner.query(`
      CREATE TABLE "student_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "target_exam_type" varchar,
        "target_exam_date" date,
        "study_hours_per_day" int,
        "strengths" jsonb NOT NULL DEFAULT '[]',
        "weaknesses" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 8. mock_tests
    await queryRunner.query(`
      CREATE TABLE "mock_tests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "exam_id" uuid NOT NULL REFERENCES "exams"("id"),
        "started_at" timestamptz NOT NULL,
        "completed_at" timestamptz,
        "total_score" numeric,
        "max_score" numeric NOT NULL,
        "status" varchar NOT NULL DEFAULT 'in_progress',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_mock_tests_student_id" ON "mock_tests" ("student_id")`);

    // 9. student_answers
    await queryRunner.query(`
      CREATE TABLE "student_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "mock_test_id" uuid NOT NULL REFERENCES "mock_tests"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "questions"("id"),
        "selected_option" varchar,
        "is_correct" boolean,
        "time_taken_sec" int,
        "answered_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("mock_test_id", "question_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_student_answers_mock_test_id" ON "student_answers" ("mock_test_id")`);

    // 10. student_reviews
    await queryRunner.query(`
      CREATE TABLE "student_reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "is_bookmarked" boolean NOT NULL DEFAULT false,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("student_id", "question_id")
      )
    `);

    // 11. student_doubts
    await queryRunner.query(`
      CREATE TABLE "student_doubts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "question_id" uuid REFERENCES "questions"("id"),
        "doubt_text" text NOT NULL,
        "answer_text" text,
        "related_question_ids" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_student_doubts_student_id" ON "student_doubts" ("student_id")`);

    // 12. study_plans
    await queryRunner.query(`
      CREATE TABLE "study_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "target_exam_id" uuid REFERENCES "exams"("id"),
        "plan" jsonb NOT NULL,
        "generated_at" timestamptz NOT NULL DEFAULT now(),
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_study_plans_student_active" ON "study_plans" ("student_id", "is_active")`);

    // 13. performance_metrics
    await queryRunner.query(`
      CREATE TABLE "performance_metrics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "mock_test_id" uuid REFERENCES "mock_tests"("id") ON DELETE CASCADE,
        "subject_id" uuid REFERENCES "subjects"("id"),
        "topic_id" uuid REFERENCES "topic_hierarchy"("id"),
        "accuracy_percent" numeric NOT NULL,
        "avg_time_per_question_sec" numeric,
        "questions_attempted" int NOT NULL,
        "questions_correct" int NOT NULL,
        "recorded_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_performance_metrics_student_id" ON "performance_metrics" ("student_id")`);

    // 14. audit_logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar NOT NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" uuid,
        "old_value" jsonb,
        "new_value" jsonb,
        "ip_address" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);

    // Soft-delete helper functions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION soft_delete_question(q_id uuid) RETURNS void AS $$
        UPDATE questions SET is_deleted = true, updated_at = now() WHERE id = q_id;
      $$ LANGUAGE sql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION soft_delete_exam(e_id uuid) RETURNS void AS $$
        UPDATE exams SET is_deleted = true, updated_at = now() WHERE id = e_id;
      $$ LANGUAGE sql
    `);

    // Audit trigger (example wired to mock_tests + student_answers)
    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_audit_mock_tests
        AFTER UPDATE OR DELETE ON mock_tests
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_audit_student_answers
        AFTER UPDATE OR DELETE ON student_answers
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()
    `);

    // Materialized view: per-student dashboard summary
    await queryRunner.query(`
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
      GROUP BY sp.id, u.full_name
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_student_dashboard_summary_student_id ON student_dashboard_summary (student_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS student_dashboard_summary`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_student_answers ON student_answers`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_mock_tests ON mock_tests`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS audit_trigger_fn()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS soft_delete_exam(uuid)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS soft_delete_question(uuid)`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "study_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_doubts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_answers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mock_tests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vector_embeddings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "topic_hierarchy"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subjects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
