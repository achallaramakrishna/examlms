import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSelectedExamType, examTypeLabel } from '../utils/examType';

interface ExamSubject {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  examType: string;
  totalQuestions: number;
  durationMinutes: number;
  subject?: ExamSubject | null;
}

function displayExamName(exam: Exam): string {
  const subjectName = exam.subject?.name;
  let name = exam.name;
  if (subjectName) {
    name = name.replace(new RegExp(`^${exam.examType}\\s+${subjectName}\\s*[—–-]\\s*`, 'i'), '');
  }
  name = name.replace(new RegExp(`^${exam.examType}\\s*[—–-]\\s*`, 'i'), '');
  return name.trim() || exam.name;
}

function subjectsFromExams(exams: Exam[]): { name: string; id: string }[] {
  const map = new Map<string, string>();
  for (const exam of exams) {
    if (exam.subject?.name) {
      map.set(exam.subject.name, exam.subject.id || exam.subject.name);
    }
  }
  return Array.from(map.entries())
    .map(([name, id]) => ({ name, id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function ExamList() {
  const examType = getSelectedExamType();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api
      .get<{ exams: Exam[] }>('/exams', { params: examType ? { examType } : undefined })
      .then((res) => setExams(res.data.exams))
      .finally(() => setLoading(false));
  }, [examType]);

  const subjects = subjectsFromExams(exams);
  const filteredExams =
    subjectFilter === 'all' ? exams : exams.filter((e) => e.subject?.name === subjectFilter);

  return (
    <div className="exam-list">
      <div className="page-header">
        <h1>Available Exams</h1>
        <p className="subtitle">
          {examType ? (
            <>
              Showing <strong>{examTypeLabel(examType)}</strong> only — pick a subject, then start a mock test.{' '}
              <Link to="/choose-exam">Switch exam</Link>
            </>
          ) : (
            <>
              <Link to="/choose-exam">Choose your exam</Link> to see mock tests for that track.
            </>
          )}
        </p>
      </div>

      {loading ? (
        <p className="loading-state">Loading exams...</p>
      ) : exams.length === 0 ? (
        <div className="card empty-state">
          {examType ? `No ${examType} exams configured yet.` : 'No exams configured yet.'}
        </div>
      ) : (
        <>
          {subjects.length > 0 && (
            <div className="subject-tabs" role="tablist" aria-label="Subjects">
              <button
                type="button"
                className={subjectFilter === 'all' ? 'active' : ''}
                onClick={() => setSubjectFilter('all')}
              >
                All subjects
              </button>
              {subjects.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={subjectFilter === s.name ? 'active' : ''}
                  onClick={() => setSubjectFilter(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {filteredExams.length === 0 ? (
            <div className="card empty-state">No exams in this subject yet.</div>
          ) : (
            <div className="exam-grid">
              {filteredExams.map((exam) => (
                <Link to={`/mock-test/${exam.id}`} className="exam-card" key={exam.id}>
                  <div>
                    <div className="exam-name">{displayExamName(exam)}</div>
                    <div className="exam-meta">
                      {exam.subject?.name && (
                        <span className="badge badge-neutral" style={{ marginRight: 8 }}>
                          {exam.subject.name}
                        </span>
                      )}
                      {exam.totalQuestions} questions &middot; {exam.durationMinutes} min
                    </div>
                  </div>
                  <span className="exam-cta">Start</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
