import { useMemo, useState } from 'react';
import { MathBlock, MathText } from './MathText';
import type { PracticeLearningAid, StemHighlight } from '../types/practiceCoach';
import {
  coachModeLabel,
  pathToggleLabel,
  resolveCoachMode,
  type CoachMode,
} from '../utils/coachMode';
import { speakText, stopSpeaking } from '../utils/speech';

/** Wrap stem text so glossary terms are hoverable / tappable. */
export function HighlightedStem({
  text,
  highlights,
}: {
  text: string;
  highlights?: StemHighlight[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  const parts = useMemo(() => {
    if (!highlights?.length) return [{ type: 'text' as const, value: text }];
    const terms = highlights
      .flatMap((h) => [h.term, ...(h.aliases || [])])
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!terms.length) return [{ type: 'text' as const, value: text }];

    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'gi');
    const chunks = text.split(re);
    return chunks.filter(Boolean).map((chunk) => {
      const hit = highlights.find(
        (h) =>
          h.term.toLowerCase() === chunk.toLowerCase() ||
          h.aliases?.some((a) => a.toLowerCase() === chunk.toLowerCase())
      );
      return hit
        ? { type: 'term' as const, value: chunk, highlight: hit }
        : { type: 'text' as const, value: chunk };
    });
  }, [text, highlights]);

  return (
    <p className="question-text highlighted-stem">
      {parts.map((p, i) =>
        p.type === 'term' ? (
          <span key={i} className="stem-term-wrap">
            <button
              type="button"
              className={`stem-term ${open === p.highlight!.term ? 'active' : ''}`}
              onClick={() =>
                setOpen((cur) => (cur === p.highlight!.term ? null : p.highlight!.term))
              }
              onMouseEnter={() => setOpen(p.highlight!.term)}
              onMouseLeave={() => setOpen(null)}
            >
              {p.value}
            </button>
            {open === p.highlight!.term && (
              <span className="stem-tooltip" role="tooltip">
                <strong>{p.highlight!.term}</strong>
                <span>{p.highlight!.meaning}</span>
                {p.highlight!.subjectNote && (
                  <span className="muted">{p.highlight!.subjectNote}</span>
                )}
              </span>
            )}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </p>
  );
}

function ListenButton({ text, label }: { text?: string; label: string }) {
  if (!text?.trim()) return null;
  return (
    <button
      type="button"
      className="learn-speak"
      onClick={() => {
        stopSpeaking();
        speakText(text);
      }}
    >
      ▶ {label}
    </button>
  );
}

function preRevealHint(mode: CoachMode): string {
  switch (mode) {
    case 'recall':
      return 'Dashed underlined words are tappable glossary terms. After you check, you get a short definition and why the options trap you — no formula ladder for fact recall.';
    case 'reaction':
      return 'Tap glossary terms if needed. After you check, the reaction / mechanism path and solution audio unlock.';
    case 'process':
      return 'Tap glossary terms if needed. After you check, the process / NCERT recall path unlocks.';
    case 'concept':
      return 'Tap glossary terms if needed. After you check, the concept path and solution audio unlock.';
    case 'formula':
    default:
      return 'Dashed underlined words are tappable glossary terms. Use Listen: read question first. After you check, the formula ladder and full solution audio unlock.';
  }
}

function PathList({
  aid,
  mode,
}: {
  aid: PracticeLearningAid;
  mode: Exclude<CoachMode, 'recall'>;
}) {
  const chem = aid.subjectExtras?.chemistry as
    | { mechanismRungs?: { step?: number; title?: string; detail?: string }[]; reactionOrReagent?: string }
    | undefined;
  const bio = aid.subjectExtras?.biology as
    | { processOrder?: string[]; ncertLine?: string; eliminateByDefinition?: string }
    | undefined;

  if (mode === 'reaction' && chem?.mechanismRungs?.length) {
    return (
      <ol className="formula-ladder coach-path">
        {chem.mechanismRungs.map((rung, i) => (
          <li key={rung.step ?? i}>
            <strong>
              {(rung.step ?? i + 1)}. {rung.title || 'Step'}
            </strong>
            {rung.detail && <p>{rung.detail}</p>}
          </li>
        ))}
      </ol>
    );
  }

  if (mode === 'process' && bio?.processOrder?.length) {
    return (
      <ol className="formula-ladder coach-path">
        {bio.processOrder.map((step, i) => (
          <li key={`${i}-${step}`}>
            <strong>
              {i + 1}. {step}
            </strong>
          </li>
        ))}
      </ol>
    );
  }

  const ladder = aid.formulaLadder || [];
  if (!ladder.length) return null;

  return (
    <ol className="formula-ladder coach-path">
      {ladder.map((rung) => (
        <li key={rung.rung}>
          <strong>
            {rung.rung}. {rung.title}
          </strong>
          <p>{rung.detail}</p>
          {rung.latex && <MathBlock>{rung.latex}</MathBlock>}
        </li>
      ))}
    </ol>
  );
}

export function PracticeCoach({
  aid,
  revealed,
}: {
  aid: PracticeLearningAid;
  /** After student checks answer — show path / traps */
  revealed: boolean;
}) {
  const mode = resolveCoachMode(aid);
  const showPathUi = mode !== 'recall';
  const [pathOpen, setPathOpen] = useState(revealed && showPathUi);

  const bio = aid.subjectExtras?.biology as
    | { ncertLine?: string; eliminateByDefinition?: string; processOrder?: string[] }
    | undefined;
  const chem = aid.subjectExtras?.chemistry as
    | {
        reactionOrReagent?: string;
        exceptionNote?: string;
        mechanismRungs?: { step?: number; title?: string; detail?: string }[];
      }
    | undefined;

  return (
    <div className={`practice-coach coach-mode-${mode}`}>
      <div className="practice-coach-head">
        <h3>{coachModeLabel(mode)}</h3>
        <div className="practice-coach-actions">
          <ListenButton text={aid.readQuestionAudio} label="Listen: read question" />
          {revealed && <ListenButton text={aid.solutionAudio} label="Listen: solution" />}
        </div>
      </div>

      {aid.meta?.examPattern && (
        <p className="muted coach-pattern">Pattern: {aid.meta.examPattern}</p>
      )}

      {aid.conceptTags && aid.conceptTags.length > 0 && (
        <div className="coach-tags">
          {aid.conceptTags.map((t) => (
            <span key={t} className="badge badge-neutral">
              {t}
            </span>
          ))}
        </div>
      )}

      {!revealed && <p className="muted coach-hint">{preRevealHint(mode)}</p>}

      {revealed && mode === 'recall' && (
        <div className="coach-recall">
          {aid.finalAnswer?.whyCorrect && (
            <p className="coach-why coach-why-lead">
              <strong>Remember:</strong> {aid.finalAnswer.whyCorrect}
            </p>
          )}
          {aid.quickCheck?.ncertOrKeyLine && (
            <p className="coach-ncert">
              <strong>NCERT / key line:</strong> {aid.quickCheck.ncertOrKeyLine}
            </p>
          )}
          {bio?.ncertLine && (
            <p className="coach-ncert">
              <strong>NCERT:</strong> {bio.ncertLine}
            </p>
          )}
          {(aid.solutionSteps?.length ?? 0) > 0 && (
            <div className="coach-steps">
              <h4>How to think</h4>
              <ol>
                {aid.solutionSteps!.map((s) => (
                  <li key={s}>
                    <MathText>{s}</MathText>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {revealed && showPathUi && (
        <>
          {((aid.formulaLadder?.length ?? 0) > 0 ||
            (chem?.mechanismRungs?.length ?? 0) > 0 ||
            (bio?.processOrder?.length ?? 0) > 0) && (
            <button
              type="button"
              className="btn-outline coach-toggle"
              onClick={() => setPathOpen((v) => !v)}
            >
              {pathToggleLabel(mode, pathOpen)}
            </button>
          )}

          {pathOpen && <PathList aid={aid} mode={mode} />}

          {chem?.reactionOrReagent && (
            <p className="coach-extra">
              <strong>Reaction / reagent:</strong> {chem.reactionOrReagent}
            </p>
          )}
          {chem?.exceptionNote && (
            <p className="coach-extra">
              <strong>Exception:</strong> {chem.exceptionNote}
            </p>
          )}
          {bio?.ncertLine && (
            <p className="coach-ncert">
              <strong>NCERT:</strong> {bio.ncertLine}
            </p>
          )}

          {(aid.solutionSteps?.length ?? 0) > 0 && (
            <div className="coach-steps">
              <h4>Steps</h4>
              <ol>
                {aid.solutionSteps!.map((s) => (
                  <li key={s}>
                    <MathText>{s}</MathText>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {aid.finalAnswer?.whyCorrect && (
            <p className="coach-why">
              <strong>Why this answer:</strong> {aid.finalAnswer.whyCorrect}
            </p>
          )}
        </>
      )}

      {revealed && (
        <>
          {(aid.optionTraps?.length ?? 0) > 0 && (
            <div className="coach-traps">
              <h4>{mode === 'recall' ? 'Why other options' : 'Option traps'}</h4>
              <ul>
                {aid.optionTraps!.map((t) => (
                  <li key={t.option}>
                    <strong>{t.option}:</strong> {t.whyStudentsPick}{' '}
                    <span className="muted">→ {t.howToAvoid}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aid.commonMistake && (
            <p className="coach-mistake">
              <strong>Common mistake:</strong> {aid.commonMistake}
            </p>
          )}

          {bio?.eliminateByDefinition && mode === 'recall' && (
            <p className="coach-extra">
              <strong>Eliminate by definition:</strong> {bio.eliminateByDefinition}
            </p>
          )}

          {aid.examTransferTip && (
            <p className="coach-transfer">
              <strong>Exam tip:</strong> {aid.examTransferTip}
            </p>
          )}

          {aid.quickCheck?.limitingCase && mode !== 'recall' && (
            <p className="muted">
              <strong>Check:</strong> {aid.quickCheck.limitingCase}
            </p>
          )}
        </>
      )}
    </div>
  );
}
