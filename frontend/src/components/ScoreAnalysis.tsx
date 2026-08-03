export interface ScoreAnalysisProps {
  score: number;
  maxScore: number;
  correctCount?: number;
  totalQuestions?: number;
  bySubject?: { subject: string; accuracyPercent: number }[];
}

export function ScoreAnalysis({ score, maxScore, correctCount, totalQuestions, bySubject = [] }: ScoreAnalysisProps) {
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className="score-analysis">
      <h2>
        {score} / {maxScore}
      </h2>
      <p>{percent}% overall</p>
      {correctCount !== undefined && totalQuestions !== undefined && (
        <p className="score-breakdown">
          {correctCount} correct, {totalQuestions - correctCount} wrong or unattempted (+4 / -1 marking)
        </p>
      )}

      {bySubject.length > 0 && (
        <ul className="score-by-subject">
          {bySubject.map((s) => (
            <li key={s.subject}>
              <span>{s.subject}</span>
              <span>{Math.round(s.accuracyPercent)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
