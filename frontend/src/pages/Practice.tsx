import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { QuestionViewer, QuestionOption } from '../components/QuestionViewer';
import { getSelectedExamType } from '../utils/examType';

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  questionCount: number;
}

interface PracticeQuestion {
  id: string;
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOption[];
  difficulty: string;
}

interface CheckResult {
  isCorrect: boolean;
  correctOption: string;
  explanation: string | null;
}

export function Practice() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | undefined>();
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [tally, setTally] = useState({ correct: 0, attempted: 0 });

  useEffect(() => {
    const examType = getSelectedExamType();
    api.get<{ subjects: Subject[] }>('/subjects', { params: examType ? { examType } : undefined }).then((res) => {
      setSubjects(res.data.subjects);
      if (res.data.subjects.length > 0) setSubjectId(res.data.subjects[0].id);
    });
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setLoadingTopics(true);
    api
      .get<{ topics: Topic[] }>(`/subjects/${subjectId}/topics`)
      .then((res) => setTopics(res.data.topics))
      .finally(() => setLoadingTopics(false));
  }, [subjectId]);

  async function startChapter(topic: Topic) {
    const { data } = await api.get<{ questions: PracticeQuestion[] }>(
      `/subjects/${subjectId}/topics/${topic.id}/questions`
    );
    setActiveTopic(topic);
    setQuestions(data.questions);
    setIndex(0);
    setSelectedOption(undefined);
    setResult(null);
    setTally({ correct: 0, attempted: 0 });
  }

  function backToChapters() {
    setActiveTopic(null);
    setQuestions([]);
  }

  async function checkAnswer() {
    if (!selectedOption) return;
    const current = questions[index];
    setChecking(true);
    try {
      const { data } = await api.post<CheckResult>(`/questions/${current.id}/check`, { selectedOption });
      setResult(data);
      setTally((t) => ({ correct: t.correct + (data.isCorrect ? 1 : 0), attempted: t.attempted + 1 }));
    } finally {
      setChecking(false);
    }
  }

  function nextQuestion() {
    setIndex((i) => i + 1);
    setSelectedOption(undefined);
    setResult(null);
  }

  if (activeTopic) {
    const current = questions[index];
    const isLast = index === questions.length - 1;
    const isDone = index >= questions.length;

    return (
      <div className="practice-session">
        <div className="page-header">
          <h1>{activeTopic.name}</h1>
          <button type="button" className="btn-outline" onClick={backToChapters}>
            Change chapter
          </button>
        </div>

        {isDone ? (
          <div className="card">
            <h2>
              Practice complete: {tally.correct} / {tally.attempted} correct
            </h2>
            <button type="button" onClick={backToChapters}>
              Back to chapters
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="test-progress">
              Question {index + 1} of {questions.length} &middot; {tally.correct}/{tally.attempted} correct so far
            </div>

            <QuestionViewer
              questionText={current.questionText}
              questionImageUrl={current.questionImageUrl}
              options={current.options}
              selectedOption={selectedOption}
              correctOption={result?.correctOption}
              showAnswer={!!result}
              onSelect={(label) => !result && setSelectedOption(label)}
            />

            {result && (
              <div className={`practice-feedback ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                <strong>{result.isCorrect ? 'Correct!' : 'Not quite.'}</strong>
                {result.explanation && <p>{result.explanation}</p>}
              </div>
            )}

            <div className="test-nav">
              {result ? (
                <button type="button" onClick={nextQuestion}>
                  {isLast ? 'Finish' : 'Next question'}
                </button>
              ) : (
                <button type="button" disabled={!selectedOption || checking} onClick={checkAnswer}>
                  {checking ? 'Checking...' : 'Check answer'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const examType = getSelectedExamType();

  return (
    <div className="practice-picker">
      <div className="page-header">
        <h1>Practice by Chapter</h1>
        <p className="subtitle">
          {examType ? (
            <>
              Browsing <strong>{examType}</strong> — pick a subject, then a chapter.{' '}
              <Link to="/choose-exam">Change exam</Link>
            </>
          ) : (
            <>
              <Link to="/choose-exam">Choose NEET or KCET</Link>, then pick a subject and chapter.
            </>
          )}
        </p>
      </div>

      <div className="subject-tabs" role="tablist" aria-label="Subjects">
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === subjectId ? 'active' : ''}
            onClick={() => setSubjectId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {loadingTopics ? (
        <p className="loading-state">Loading chapters...</p>
      ) : (
        <div className="chapter-grid">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chapter-card"
              disabled={t.questionCount === 0}
              onClick={() => startChapter(t)}
            >
              <span className="chapter-name">{t.name}</span>
              <span className="chapter-count">
                {t.questionCount === 0 ? 'No questions yet' : `${t.questionCount} question${t.questionCount === 1 ? '' : 's'}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
