import { api } from './api';

export interface DoubtResponse {
  answer: string;
  relatedQuestionIds: string[];
}

export async function askDoubt(
  question: string,
  options: { examId?: string; subjectId?: string } = {}
): Promise<DoubtResponse> {
  const { data } = await api.post<DoubtResponse>('/ai/doubt', { question, ...options });
  return data;
}
