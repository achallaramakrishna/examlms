import { useState } from 'react';
import { QuestionViewer, QuestionOption } from './QuestionViewer';

export interface TestQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOption[];
}

export interface TestInterfaceProps {
  questions: TestQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
}

/**
 * Drives a mock-test attempt: one question at a time, tracks answers locally,
 * and hands the final answer map to the parent (typically MockTest page,
 * which POSTs it to /api/students/mock-tests/:id/submit).
 */
export function TestInterface({ questions, onSubmit }: TestInterfaceProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = questions[index];
  const isLast = index === questions.length - 1;

  function selectAnswer(label: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: label }));
  }

  if (!current) return null;

  return (
    <div className="test-interface">
      <div className="test-progress">
        Question {index + 1} of {questions.length}
      </div>

      <QuestionViewer
        questionText={current.questionText}
        questionImageUrl={current.questionImageUrl}
        options={current.options}
        selectedOption={answers[current.id]}
        onSelect={selectAnswer}
      />

      <div className="test-nav">
        <button type="button" className="btn-outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </button>
        {isLast ? (
          <button type="button" onClick={() => onSubmit(answers)}>
            Submit Test
          </button>
        ) : (
          <button type="button" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
