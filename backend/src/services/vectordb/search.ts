import { AppDataSource } from '../../config/database';
import { embedText } from './embedding';
import { toVectorLiteral } from './vectorLiteral';

export interface SimilarQuestionResult {
  questionId: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  difficulty: string;
  questionText: string;
  distance: number;
}

interface SearchFilters {
  examId?: string;
  subjectId?: string;
}

/**
 * Semantic (cosine-distance) search over indexed questions via pgvector's
 * `<=>` operator — used by the doubt-resolver agent to find similar/related
 * questions, and by the study planner to surface practice questions for a
 * weak topic. TypeORM's QueryBuilder has no pgvector support, so this runs
 * as a raw parameterized query.
 */
export async function searchSimilarQuestions(
  queryText: string,
  limit = 5,
  filters: SearchFilters = {}
): Promise<SimilarQuestionResult[]> {
  const vector = toVectorLiteral(await embedText(queryText));

  const conditions: string[] = ['NOT q.is_deleted'];
  const params: unknown[] = [vector];

  if (filters.examId) {
    params.push(filters.examId);
    conditions.push(`q.exam_id = $${params.length}`);
  }
  if (filters.subjectId) {
    params.push(filters.subjectId);
    conditions.push(`q.subject_id = $${params.length}`);
  }

  params.push(limit);

  const rows = await AppDataSource.query(
    `SELECT
       q.id AS "questionId",
       q.subject_id AS "subjectId",
       s.name AS "subjectName",
       q.topic_id AS "topicId",
       t.name AS "topicName",
       q.difficulty,
       q.question_text AS "questionText",
       (v.embedding <=> $1::vector) AS distance
     FROM vector_embeddings v
     JOIN questions q ON q.id = v.question_id
     JOIN subjects s ON s.id = q.subject_id
     LEFT JOIN topic_hierarchy t ON t.id = q.topic_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY v.embedding <=> $1::vector
     LIMIT $${params.length}`,
    params
  );

  return rows as SimilarQuestionResult[];
}
