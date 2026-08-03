import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { TestInterface, TestQuestion } from '../components/TestInterface';
import { ScoreAnalysis } from '../components/ScoreAnalysis';

export function MockTest() {
  const { examId } = useParams<{ examId: string }>();
  const [mockTestId, setMockTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    async function start() {
      const [questionsRes, mockTestRes] = await Promise.all([
        api.get<{ questions: TestQuestion[] }>(`/exams/${examId}/questions`),
        api.post<{ mockTest: { id: string } }>('/students/mock-tests', { examId }),
      ]);
      setQuestions(questionsRes.data.questions);
      setMockTestId(mockTestRes.data.mockTest.id);
      setLoading(false);
    }

    start();
  }, [examId]);

  async function handleSubmit(answers: Record<string, string>) {
    if (!mockTestId) return;
    const { data } = await api.post(`/students/mock-tests/${mockTestId}/submit`, { answers });
    setResult({
      score: data.score,
      maxScore: data.maxScore,
      correctCount: data.correctCount,
      totalQuestions: data.totalQuestions,
    });
  }

  if (loading) return <p className="loading-state">Preparing your mock test...</p>;

  if (result) {
    return (
      <div className="card">
        <ScoreAnalysis
          score={result.score}
          maxScore={result.maxScore}
          correctCount={result.correctCount}
          totalQuestions={result.totalQuestions}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <TestInterface questions={questions} onSubmit={handleSubmit} />
    </div>
  );
}
