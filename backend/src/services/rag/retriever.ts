import { searchSimilarQuestions, SimilarQuestionResult } from '../vectordb/search';

/**
 * Thin retrieval wrapper the RAG pipeline and agents call into. Kept separate
 * from vectordb/search.ts so the retrieval *strategy* (how many results, how
 * they're filtered/ranked before being handed to the LLM) can evolve
 * independently of the raw pgvector query.
 */
export async function retrieveContext(
  query: string,
  options: { examId?: string; subjectId?: string; topK?: number } = {}
): Promise<SimilarQuestionResult[]> {
  const { examId, subjectId, topK = 4 } = options;
  return searchSimilarQuestions(query, topK, { examId, subjectId });
}

export function formatContextForPrompt(results: SimilarQuestionResult[]): string {
  if (results.length === 0) return 'No related questions found.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] (${r.subjectName}${r.topicName ? ` / ${r.topicName}` : ''}, ${r.difficulty})\n${r.questionText}`
    )
    .join('\n\n');
}
