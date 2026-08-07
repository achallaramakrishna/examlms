import { api } from '../services/api';

const TRACK = 'physics-xi';

export type FigureOverrideMap = Record<string, { src: string; updatedAt?: string }>;

export interface PracticePattern {
  key: string;
  examPattern: string;
  questionCount: number;
  conceptTags: string[];
  formulaLadder: { rung: number; title: string; detail: string; latex?: string | null }[];
  solutionSteps: string[];
  commonMistake?: string;
  examTransferTip?: string;
  sampleQuestions: { id: string; stem: string; difficulty?: string }[];
  readQuestionAudio?: string;
  solutionAudio?: string;
}

export interface PracticePatternsResponse {
  slug: string;
  topics: string[];
  questionCountWithAid: number;
  patternCount: number;
  patterns: PracticePattern[];
  note?: string;
}

export async function fetchFigureOverrides(slug: string, track: string = TRACK): Promise<FigureOverrideMap> {
  const { data } = await api.get<{ figures: FigureOverrideMap }>(
    `/ncert-revision/${track}/${slug}/figures`
  );
  return data.figures || {};
}

export async function fetchPracticePatterns(slug: string, track: string = TRACK): Promise<PracticePatternsResponse> {
  const { data } = await api.get<PracticePatternsResponse>(
    `/ncert-revision/${track}/${slug}/practice-patterns`
  );
  return data;
}

export async function uploadLearnFigure(
  slug: string,
  figureId: string,
  file: File,
  track: string = TRACK
): Promise<{ src: string; figures: FigureOverrideMap }> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post<{ src: string; figures: FigureOverrideMap }>(
    `/ncert-revision/${track}/${slug}/figures/${figureId}`,
    formData
  );
  return data;
}

export async function deleteLearnFigure(
  slug: string,
  figureId: string,
  track: string = TRACK
): Promise<FigureOverrideMap> {
  const { data } = await api.delete<{ figures: FigureOverrideMap }>(
    `/ncert-revision/${track}/${slug}/figures/${figureId}`
  );
  return data.figures || {};
}

export { TRACK as LEARN_TRACK };
