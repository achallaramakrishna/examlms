export type CoachDifficulty = 'easy' | 'medium' | 'hard';

/** Explicit UI mode for Practice solve coach. Prefer setting this when generating aids. */
export type CoachMode = 'recall' | 'formula' | 'concept' | 'reaction' | 'process';

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
    /** Drives UI: recall skips formula ladder; formula/concept/reaction/process show a path. */
    coachMode?: CoachMode;
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
