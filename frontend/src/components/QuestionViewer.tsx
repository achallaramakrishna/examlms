import { HighlightedStem } from './PracticeCoach';
import type { StemHighlight } from '../types/practiceCoach';

export interface QuestionOption {
  label: string;
  text: string;
  imageUrl?: string;
}

export interface QuestionViewerProps {
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOption[];
  selectedOption?: string;
  correctOption?: string;
  showAnswer?: boolean;
  onSelect?: (label: string) => void;
  stemHighlights?: StemHighlight[];
}

export function QuestionViewer({
  questionText,
  questionImageUrl,
  options,
  selectedOption,
  correctOption,
  showAnswer = false,
  onSelect,
  stemHighlights,
}: QuestionViewerProps) {
  return (
    <div className="question-viewer">
      {stemHighlights?.length ? (
        <HighlightedStem text={questionText} highlights={stemHighlights} />
      ) : (
        <p className="question-text">{questionText}</p>
      )}
      {questionImageUrl && (
        <img className="question-image" src={questionImageUrl} alt="Question diagram" />
      )}
      <ul className="question-options">
        {options.map((option) => {
          const isSelected = selectedOption === option.label;
          const isCorrect = showAnswer && correctOption === option.label;
          const isWrongSelection = showAnswer && isSelected && correctOption !== option.label;

          return (
            <li key={option.label}>
              <button
                type="button"
                className={[
                  'question-option',
                  isSelected ? 'selected' : '',
                  isCorrect ? 'correct' : '',
                  isWrongSelection ? 'incorrect' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect?.(option.label)}
                disabled={showAnswer}
              >
                <span className="question-option-body">
                  <strong>{option.label}.</strong> {option.text}
                  {option.imageUrl && (
                    <img className="option-image" src={option.imageUrl} alt={`Option ${option.label} diagram`} />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
