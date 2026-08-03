/**
 * Bulk-loads questions from a JSON file into Postgres, then embeds and
 * indexes each one into vector_embeddings (pgvector).
 *
 * Usage: ts-node scripts/ingest-questions.ts [path/to/questions.json]
 * Defaults to ../data/sample-questions.json
 */
import fs from 'fs';
import path from 'path';
import { pgPool, embedAndIndexQuestion, RawQuestionInput } from './shared';

async function ingestOne(question: RawQuestionInput): Promise<void> {
  const { rows } = await pgPool.query(
    `INSERT INTO questions (exam_id, subject_id, topic_id, question_text, question_image_url, options, correct_option, explanation, difficulty, source, previous_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      question.examId,
      question.subjectId,
      question.topicId ?? null,
      question.questionText,
      question.questionImageUrl ?? null,
      JSON.stringify(question.options),
      question.correctOption,
      question.explanation ?? null,
      question.difficulty ?? 'medium',
      question.source ?? null,
      question.previousYear ?? null,
    ]
  );

  const questionId = rows[0].id;
  await embedAndIndexQuestion(questionId, question.questionText);
  console.log(`Ingested "${question.questionText.slice(0, 60)}..." -> ${questionId}`);
}

async function main() {
  const filePath = process.argv[2] ?? path.join(__dirname, '../data/sample-questions.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const questions: RawQuestionInput[] = JSON.parse(raw);

  console.log(`Ingesting ${questions.length} question(s) from ${filePath}`);

  let skipped = 0;
  for (const question of questions) {
    // Files produced by extract-scanned-questions.ts may contain entries
    // still awaiting manual review (missing answer/subject match, or an
    // answer that couldn't be cross-checked) — skip those instead of
    // inserting bad/incomplete/unverified data.
    if (!question.correctOption || !question.subjectId || question.needsReview) {
      skipped += 1;
      const reason = !question.correctOption
        ? 'missing correctOption'
        : !question.subjectId
          ? 'missing subjectId'
          : 'flagged needsReview';
      console.warn(`Skipping "${question.questionText.slice(0, 60)}..." — ${reason}. Fix it in the source file and re-run.`);
      continue;
    }
    await ingestOne(question);
  }

  console.log(`Ingestion complete. ${skipped > 0 ? `${skipped} question(s) skipped — see warnings above.` : ''}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pgPool.end());
