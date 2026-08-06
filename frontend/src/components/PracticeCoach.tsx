import { useMemo, useState } from 'react';
import { MathBlock, MathText } from './MathText';
import type { PracticeLearningAid, StemHighlight } from '../types/practiceCoach';
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

export function PracticeCoach({
  aid,
  revealed,
}: {
  aid: PracticeLearningAid;
  /** After student checks answer — show full ladder / traps */
  revealed: boolean;
}) {
  const [ladderOpen, setLadderOpen] = useState(revealed);

  return (
    <div className="practice-coach">
      <div className="practice-coach-head">
        <h3>Solve coach</h3>
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

      {!revealed && (
        <p className="muted coach-hint">
          Hover underlined words for meanings. Attempt the question first — then open the formula
          ladder and full solution audio.
        </p>
      )}

      {revealed && (
        <>
          <button
            type="button"
            className="btn-outline coach-toggle"
            onClick={() => setLadderOpen((v) => !v)}
          >
            {ladderOpen ? 'Hide formula ladder' : 'Show formula ladder'}
          </button>

          {ladderOpen && (
            <ol className="formula-ladder">
              {(aid.formulaLadder || []).map((rung) => (
                <li key={rung.rung}>
                  <strong>
                    {rung.rung}. {rung.title}
                  </strong>
                  <p>{rung.detail}</p>
                  {rung.latex && <MathBlock>{rung.latex}</MathBlock>}
                </li>
              ))}
            </ol>
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

          {(aid.optionTraps?.length ?? 0) > 0 && (
            <div className="coach-traps">
              <h4>Option traps</h4>
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

          {aid.examTransferTip && (
            <p className="coach-transfer">
              <strong>Exam tip:</strong> {aid.examTransferTip}
            </p>
          )}

          {aid.quickCheck?.limitingCase && (
            <p className="muted">
              <strong>Check:</strong> {aid.quickCheck.limitingCase}
            </p>
          )}
        </>
      )}
    </div>
  );
}
