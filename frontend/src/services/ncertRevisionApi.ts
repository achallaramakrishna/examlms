import { api } from '../services/api';

const TRACK = 'physics-xi';

export type FigureOverrideMap = Record<string, { src: string; updatedAt?: string }>;

export async function fetchFigureOverrides(slug: string): Promise<FigureOverrideMap> {
  const { data } = await api.get<{ figures: FigureOverrideMap }>(
    `/ncert-revision/${TRACK}/${slug}/figures`
  );
  return data.figures || {};
}

export async function uploadLearnFigure(
  slug: string,
  figureId: string,
  file: File
): Promise<{ src: string; figures: FigureOverrideMap }> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post<{ src: string; figures: FigureOverrideMap }>(
    `/ncert-revision/${TRACK}/${slug}/figures/${figureId}`,
    formData
  );
  return data;
}

export async function deleteLearnFigure(
  slug: string,
  figureId: string
): Promise<FigureOverrideMap> {
  const { data } = await api.delete<{ figures: FigureOverrideMap }>(
    `/ncert-revision/${TRACK}/${slug}/figures/${figureId}`
  );
  return data.figures || {};
}

export { TRACK as LEARN_TRACK };
