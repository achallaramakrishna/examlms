export type CoachDifficulty = 'easy' | 'medium' | 'hard';

export interface StemHighlight {
  term: string;
  aliases?: string[];
  meaning: string;
  subjectNote?: string;
}

export interface FormulaRung {
  rung: number;
  title: string;
  detail: string;
  latex?: string | null;
}

export interface PracticeLearningAid {
  meta?: {
    subject?: string;
    chapter?: string;
    questionType?: string;
    examPattern?: string;
    difficulty?: CoachDifficulty;
    neetRelevance?: 'high' | 'medium' | 'low';
  };
  stemHighlights?: StemHighlight[];
  readQuestionAudio?: string;
  given?: { symbol: string; value: string; meaning: string }[];
  find?: string;
  conceptTags?: string[];
  formulaLadder?: FormulaRung[];
  solutionSteps?: string[];
  finalAnswer?: { option?: string; value?: string; whyCorrect?: string };
  optionTraps?: { option: string; whyStudentsPick: string; howToAvoid: string }[];
  solutionAudio?: string;
  commonMistake?: string;
  examTransferTip?: string;
  quickCheck?: {
    unitsOk?: boolean;
    limitingCase?: string;
    ncertOrKeyLine?: string;
  };
  subjectExtras?: Record<string, unknown>;
}
