export type NeetRelevance = 'high' | 'medium' | 'low';
export type Difficulty = 'basic' | 'intermediate' | 'advanced';

export interface RevisionFormula {
  id: string;
  name: string;
  latex: string;
  plain: string;
  symbols?: Array<string | { symbol: string; meaning: string }>;
  whenToUse?: string;
  commonMistakes?: string[];
  questionPatterns?: {
    patternName: string;
    howToInterpret: string;
    howItConnectsToFormula: string;
    exampleStem: string;
    difficulty: Difficulty;
  }[];
  audioScript?: string;
}

export interface RevisionFlashcard {
  id: string;
  difficulty: Difficulty;
  tags?: string[];
  stages: {
    question: string;
    interpretation: string;
    formula: string;
    solutionSteps: string[];
    answer: string;
  };
  audioScript?: string;
}

export interface LadderItem {
  id: string;
  question: string;
  interpretation: string;
  formulaIds?: string[];
  steps: string[];
  answer: string;
  audioScript?: string;
}

export interface RevisionPack {
  meta: {
    examTrack?: string;
    subject: string;
    classLevel: string;
    chapterNumber: number;
    chapterTitle: string;
    ncertCode?: string;
    estimatedRevisionMinutes?: number;
  };
  learningOutcomes?: string[];
  cheatSheet?: {
    oneLiner?: string;
    mustKnowBullets?: string[];
    keyTables?: { title: string; rows: string[][] }[];
  };
  highlights?: {
    id: string;
    type: string;
    section?: string;
    text: string;
    whyItMatters?: string;
    neetRelevance?: NeetRelevance;
  }[];
  definitions?: { id: string; term: string; definition: string; section?: string }[];
  formulas: RevisionFormula[];
  flashcards?: RevisionFlashcard[];
  problemLadder?: {
    conceptWarmup?: string[];
    basic?: LadderItem[];
    intermediate?: LadderItem[];
    advanced?: LadderItem[];
    transferPrompt?: string;
  };
  studentTutorPrompt?: string;
  selfCheck?: { q: string; a: string }[];
}

export interface ChapterIndexItem {
  number: number;
  title: string;
  slug: string;
  status: 'ready' | 'coming_soon';
  ncertCode?: string;
}

export interface ChapterIndex {
  subject: string;
  classLevel: string;
  chapters: ChapterIndexItem[];
}
