export type ExamType = 'NEET' | 'KCET' | 'JEE';

export interface ExamTypeOption {
  value: ExamType;
  label: string;
  description: string;
  /** When true, shown but not selectable yet */
  comingSoon?: boolean;
}

export const EXAM_TYPES: ExamTypeOption[] = [
  {
    value: 'NEET',
    label: 'NEET',
    description: 'Physics, Chemistry, Botany & Zoology — content available now',
  },
  {
    value: 'KCET',
    label: 'KCET',
    description: 'Coming soon — we will open this once more questions are ready',
    comingSoon: true,
  },
  {
    value: 'JEE',
    label: 'IIT / JEE',
    description: 'Coming soon — Physics, Chemistry & Mathematics',
    comingSoon: true,
  },
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

export function examTypeLabel(examType: ExamType | null | undefined): string {
  if (!examType) return '';
  return EXAM_TYPES.find((e) => e.value === examType)?.label ?? examType;
}

export function isExamTypeAvailable(examType: ExamType): boolean {
  return EXAM_TYPES.some((e) => e.value === examType && !e.comingSoon);
}
