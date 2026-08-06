import type { PracticeLearningAid } from '../types/practiceCoach';

/** How the Practice solve coach should present this question. */
export type CoachMode = 'recall' | 'formula' | 'concept' | 'reaction' | 'process';

const VALID: CoachMode[] = ['recall', 'formula', 'concept', 'reaction', 'process'];

function ladderHasLatex(aid: PracticeLearningAid): boolean {
  return (aid.formulaLadder || []).some(
    (r) => typeof r.latex === 'string' && r.latex.trim().length > 0
  );
}

function subjectOf(aid: PracticeLearningAid): string {
  return (aid.meta?.subject || '').toLowerCase();
}

/**
 * Prefer explicit meta.coachMode; otherwise infer from questionType / subject / ladder.
 * Simple fact MCQs (e.g. "Light year is a unit of") → recall — no formula ladder UI.
 */
export function resolveCoachMode(aid: PracticeLearningAid): CoachMode {
  const explicit = aid.meta?.coachMode;
  if (explicit && VALID.includes(explicit)) return explicit;

  const qtype = (aid.meta?.questionType || '').toLowerCase();
  const subject = subjectOf(aid);
  const hasLatex = ladderHasLatex(aid);

  if (qtype === 'numerical_mcq') return hasLatex ? 'formula' : 'concept';
  if (qtype === 'reaction') return 'reaction';
  if (qtype === 'process') return 'process';

  if (subject === 'biology') {
    const bio = aid.subjectExtras?.biology as
      | { processOrder?: unknown[]; ncertLine?: string }
      | undefined;
    if (Array.isArray(bio?.processOrder) && bio.processOrder.length > 0) return 'process';
    return 'recall';
  }

  if (subject === 'chemistry') {
    const chem = aid.subjectExtras?.chemistry as
      | { mechanismRungs?: unknown[]; reactionOrReagent?: string }
      | undefined;
    if (
      (Array.isArray(chem?.mechanismRungs) && chem.mechanismRungs.length > 0) ||
      qtype === 'reaction'
    ) {
      return 'reaction';
    }
    if (hasLatex) return 'formula';
    if (qtype === 'conceptual' || qtype === 'assertion_reason' || qtype === 'match') {
      return hasLatex ? 'concept' : 'recall';
    }
    return 'concept';
  }

  // Physics (default) and unknown subjects
  if (qtype === 'conceptual' || qtype === 'assertion_reason' || qtype === 'match' || qtype === 'diagram') {
    return hasLatex ? 'concept' : 'recall';
  }

  if (hasLatex) return 'formula';
  return 'concept';
}

export function coachModeLabel(mode: CoachMode): string {
  switch (mode) {
    case 'recall':
      return 'Quick recall';
    case 'formula':
      return 'Solve coach';
    case 'concept':
      return 'Concept coach';
    case 'reaction':
      return 'Reaction coach';
    case 'process':
      return 'Process coach';
  }
}

export function pathToggleLabel(mode: CoachMode, open: boolean): string {
  const noun =
    mode === 'formula'
      ? 'formula ladder'
      : mode === 'reaction'
        ? 'reaction path'
        : mode === 'process'
          ? 'process path'
          : 'concept path';
  return open ? `Hide ${noun}` : `Show ${noun}`;
}

/** Modes that belong on Learn “From Practice bank” pattern aggregation. */
export function isPracticePatternWorthy(mode: CoachMode): boolean {
  return mode === 'formula' || mode === 'concept' || mode === 'reaction' || mode === 'process';
}
