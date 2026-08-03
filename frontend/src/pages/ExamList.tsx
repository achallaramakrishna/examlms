import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSelectedExamType } from '../utils/examType';

interface Exam {
  id: string;
  name: string;
  examType: string;
  totalQuestions: number;
  durationMinutes: number;
}

export function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const examType = getSelectedExamType();
    api
      .get<{ exams: Exam[] }>('/exams', { params: examType ? { examType } : undefined })
      .then((res) => setExams(res.data.exams))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="exam-list">
      <div className="page-header">
        <h1>Available Exams</h1>
        <p className="subtitle">Pick a mock test to start practicing.</p>
      </div>

      {loading ? (
        <p className="loading-state">Loading exams...</p>
      ) : exams.length === 0 ? (
        <div className="card empty-state">No exams configured yet.</div>
      ) : (
        <div className="exam-grid">
          {exams.map((exam) => (
            <Link to={`/mock-test/${exam.id}`} className="exam-card" key={exam.id}>
              <div>
                <div className="exam-name">{exam.name}</div>
                <div className="exam-meta">
                  <span className="badge badge-neutral" style={{ marginRight: 8 }}>{exam.examType}</span>
                  {exam.totalQuestions} questions &middot; {exam.durationMinutes} min
                </div>
              </div>
              <span className="exam-cta">Start</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
