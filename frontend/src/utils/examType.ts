export type ExamType = 'NEET' | 'KCET' | 'JEE';

export const EXAM_TYPES: { value: ExamType; label: string; description: string }[] = [
  { value: 'NEET', label: 'NEET', description: 'Physics, Chemistry, Botany, Zoology' },
  { value: 'KCET', label: 'KCET', description: 'Physics, Chemistry, plus Biology or Mathematics' },
  { value: 'JEE', label: 'JEE', description: 'Physics, Chemistry, Mathematics' },
];

const STORAGE_KEY = 'examType';

export function getSelectedExamType(): ExamType | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'NEET' || value === 'KCET' || value === 'JEE' ? value : null;
}

export function setSelectedExamType(examType: ExamType): void {
  localStorage.setItem(STORAGE_KEY, examType);
}

export function clearSelectedExamType(): void {
  localStorage.removeItem(STORAGE_KEY);
}
