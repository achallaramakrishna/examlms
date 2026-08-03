import { api } from './api';

export interface SemanticSearchResult {
  questionId: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  difficulty: string;
  questionText: string;
  distance: number;
}

export async function semanticSearch(
  query: string,
  options: { examId?: string; subjectId?: string; limit?: number } = {}
): Promise<SemanticSearchResult[]> {
  const { data } = await api.get<{ results: SemanticSearchResult[] }>('/ai/search', {
    params: { query, ...options },
  });
  return data.results;
}
