import { answerWithRag } from '../rag/ragPipeline';

export interface DoubtResolverInput {
  question: string;
  examId?: string;
  subjectId?: string;
}

export interface DoubtResolverOutput {
  answer: string;
  relatedQuestionIds: string[];
}

/**
 * Answers a student's free-text doubt, grounded in semantically similar
 * questions retrieved from the vector store (RAG).
 */
export async function resolveDoubt(input: DoubtResolverInput): Promise<DoubtResolverOutput> {
  const { answer, sources } = await answerWithRag(input.question, {
    examId: input.examId,
    subjectId: input.subjectId,
  });

  return { answer, relatedQuestionIds: sources };
}
