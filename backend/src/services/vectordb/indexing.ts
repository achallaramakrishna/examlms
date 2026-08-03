import { AppDataSource } from '../../config/database';
import { VectorEmbedding } from '../../models/VectorEmbedding';
import { Question } from '../../models/Question';
import { embedText } from './embedding';

/**
 * Embeds a question's text and upserts the vector into vector_embeddings
 * (pgvector), keyed 1:1 by question_id.
 */
export async function indexQuestion(question: Question): Promise<void> {
  const vector = await embedText(question.questionText);
  const repo = AppDataSource.getRepository(VectorEmbedding);

  const existing = await repo.findOneBy({ questionId: question.id });
  if (existing) {
    existing.embedding = vector;
    await repo.save(existing);
    return;
  }

  await repo.save(repo.create({ questionId: question.id, embedding: vector }));
}

export async function indexQuestions(questions: Question[]): Promise<void> {
  for (const question of questions) {
    await indexQuestion(question);
  }
}

export async function removeQuestionEmbedding(questionId: string): Promise<void> {
  await AppDataSource.getRepository(VectorEmbedding).delete({ questionId });
}
