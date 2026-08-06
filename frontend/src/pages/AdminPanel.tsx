import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSelectedExamType } from '../utils/examType';
import { EditQuestionsTab } from './AdminQuestionEditor';

interface Exam {
  id: string;
  name: string;
  examType: string;
  totalQuestions: number;
  durationMinutes: number;
}
interface Subject {
  id: string;
  name: string;
  examTypes: string[];
}
interface Topic {
  id: string;
  name: string;
}

type Tab = 'exams' | 'questions' | 'edit-questions';

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    api.get<{ exams: Exam[] }>('/exams').then((res) => setExams(res.data.exams));
    api.get<{ subjects: Subject[] }>('/subjects').then((res) => setSubjects(res.data.subjects));
  }, []);

  function refreshExams() {
    api.get<{ exams: Exam[] }>('/exams').then((res) => setExams(res.data.exams));
  }

  return (
    <div className="admin-panel">
      <div className="page-header">
        <h1>Admin</h1>
        <p className="subtitle">Manage exams and the question bank.</p>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'exams' ? '' : 'btn-outline'}
          onClick={() => setTab('exams')}
        >
          Exams
        </button>
        <button
          type="button"
          className={tab === 'questions' ? '' : 'btn-outline'}
          onClick={() => setTab('questions')}
        >
          New Question
        </button>
        <button
          type="button"
          className={tab === 'edit-questions' ? '' : 'btn-outline'}
          onClick={() => setTab('edit-questions')}
        >
          Edit Questions
        </button>
      </div>

      {tab === 'exams' && <ExamsTab exams={exams} onCreated={refreshExams} />}
      {tab === 'questions' && <QuestionsTab exams={exams} subjects={subjects} />}
      {tab === 'edit-questions' && <EditQuestionsTab exams={exams} subjects={subjects} />}
    </div>
  );
}

function ExamsTab({ exams, onCreated }: { exams: Exam[]; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<'NEET' | 'KCET'>('NEET');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/exams', { name, examType, description, totalQuestions: 0, durationMinutes });
      setSuccess(`"${name}" created.`);
      setName('');
      setDescription('');
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-grid">
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>New Exam</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="exam-name">Name</label>
            <input id="exam-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="exam-type">Exam Type</label>
            <select id="exam-type" value={examType} onChange={(e) => setExamType(e.target.value as 'NEET' | 'KCET')}>
              <option value="NEET">NEET</option>
              <option value="KCET">KCET</option>
            </select>
          </div>
          <div>
            <label htmlFor="exam-desc">Description</label>
            <textarea id="exam-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label htmlFor="exam-duration">Duration (minutes)</label>
            <input
              id="exam-duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Creating...' : 'Create Exam'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Existing Exams</h2>
        {exams.length === 0 ? (
          <p className="empty-state">No exams yet.</p>
        ) : (
          <div className="metric-list">
            {(['NEET', 'KCET', 'JEE'] as const).map((type) => {
              const group = exams.filter((e) => e.examType === type);
              if (group.length === 0) return null;
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div className="metric-row" style={{ background: 'transparent', border: 'none', padding: '4px 0' }}>
                    <span className="metric-name">{type}</span>
                    <span className="metric-score">{group.length} exam{group.length === 1 ? '' : 's'}</span>
                  </div>
                  {group.map((exam) => (
                    <div className="metric-row" key={exam.id}>
                      <span className="metric-name">{exam.name}</span>
                      <span className="metric-score">{exam.totalQuestions} questions</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsTab({ exams, subjects }: { exams: Exam[]; subjects: Subject[] }) {
  const [examType, setExamType] = useState<'NEET' | 'KCET' | 'JEE' | ''>(
    (getSelectedExamType() as 'NEET' | 'KCET' | 'JEE' | null) ?? ''
  );
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctOption, setCorrectOption] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredExams = examType ? exams.filter((e) => e.examType === examType) : exams;
  const filteredSubjects = examType
    ? subjects.filter((s) => s.examTypes.includes(examType))
    : subjects;

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setTopicId('');
      return;
    }
    api.get<{ topics: Topic[] }>(`/subjects/${subjectId}/topics`).then((res) => {
      setTopics(res.data.topics);
      setTopicId('');
    });
  }, [subjectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/questions', {
        examId,
        subjectId,
        topicId: topicId || undefined,
        questionText,
        options: (['A', 'B', 'C', 'D'] as const).map((label) => ({ label, text: options[label] })),
        correctOption,
        explanation: explanation || undefined,
        difficulty,
      });
      setSuccess('Question created and indexed.');
      setQuestionText('');
      setOptions({ A: '', B: '', C: '', D: '' });
      setExplanation('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create question');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>New Question</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="q-examtype">Exam Type</label>
          <select
            id="q-examtype"
            value={examType}
            onChange={(e) => {
              setExamType(e.target.value as 'NEET' | 'KCET' | 'JEE' | '');
              setExamId('');
              setSubjectId('');
              setTopicId('');
            }}
            required
          >
            <option value="" disabled>
              Select NEET or KCET first
            </option>
            <option value="NEET">NEET</option>
            <option value="KCET">KCET</option>
            <option value="JEE">JEE</option>
          </select>
        </div>

        <div className="admin-grid-2">
          <div>
            <label htmlFor="q-exam">Exam</label>
            <select
              id="q-exam"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              required
              disabled={!examType}
            >
              <option value="" disabled>
                {examType ? 'Select an exam' : 'Choose exam type first'}
              </option>
              {filteredExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-subject">Subject</label>
            <select
              id="q-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              disabled={!examType}
            >
              <option value="" disabled>
                {examType ? 'Select a subject' : 'Choose exam type first'}
              </option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {topics.length > 0 && (
          <div>
            <label htmlFor="q-topic">Topic (optional)</label>
            <select id="q-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">No specific topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="q-text">Question</label>
          <textarea id="q-text" rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
        </div>

        <div className="admin-grid-2">
          {(['A', 'B', 'C', 'D'] as const).map((label) => (
            <div key={label}>
              <label htmlFor={`opt-${label}`}>Option {label}</label>
              <input
                id={`opt-${label}`}
                value={options[label]}
                onChange={(e) => setOptions((prev) => ({ ...prev, [label]: e.target.value }))}
                required
              />
            </div>
          ))}
        </div>

        <div className="admin-grid-2">
          <div>
            <label htmlFor="q-correct">Correct Option</label>
            <select id="q-correct" value={correctOption} onChange={(e) => setCorrectOption(e.target.value)}>
              {(['A', 'B', 'C', 'D'] as const).map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-difficulty">Difficulty</label>
            <select id="q-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="q-explanation">Explanation (optional)</label>
          <textarea id="q-explanation" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </div>

        <button type="submit" disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Creating & embedding...' : 'Create Question'}
        </button>
      </form>
    </div>
  );
}
