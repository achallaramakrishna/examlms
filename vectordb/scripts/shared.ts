import dotenv from 'dotenv';
import { Pool } from 'pg';
import { OpenAIEmbeddings } from '@langchain/openai';

dotenv.config();

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
});

/** Converts a JS number[] into pgvector's text literal input format. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

export interface RawQuestionInput {
  examId: string;
  subjectId: string;
  topicId?: string;
  questionText: string;
  questionImageUrl?: string;
  options: { label: string; text: string; imageUrl?: string }[];
  correctOption: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  previousYear?: number;
  /** Set by extract-scanned-questions.ts when a field couldn't be verified — ingest-questions.ts skips these. */
  needsReview?: boolean;
}

/** Embeds a question and inserts it into vector_embeddings, linked by question_id. */
export async function embedAndIndexQuestion(questionId: string, questionText: string): Promise<void> {
  const vector = await embeddings.embedQuery(questionText);
  await pgPool.query(
    `INSERT INTO vector_embeddings (question_id, embedding, model_name)
     VALUES ($1, $2::vector, 'text-embedding-3-small')
     ON CONFLICT (question_id) DO UPDATE SET embedding = EXCLUDED.embedding, created_at = now()`,
    [questionId, toVectorLiteral(vector)]
  );
}
