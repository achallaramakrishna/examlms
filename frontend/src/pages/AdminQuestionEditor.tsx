import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSelectedExamType } from '../utils/examType';

interface Exam {
  id: string;
  name: string;
  examType: string;
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
interface QuestionOption {
  label: string;
  text: string;
  imageUrl?: string;
}
interface QuestionRow {
  id: string;
  examId: string;
  subjectId: string;
  topicId?: string;
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOption[];
  correctOption: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject?: { name: string };
  topic?: { name: string };
}

const BULK_JSON_EXAMPLE = `[
  {
    "examId": "<uuid, optional if set as default below>",
    "subjectId": "<uuid, optional if set as default below>",
    "topicId": "<uuid, optional>",
    "questionText": "A ball is thrown vertically upwards...",
    "questionImageUrl": "https://... (optional)",
    "options": [
      { "label": "A", "text": "..." },
      { "label": "B", "text": "...", "imageUrl": "https://... (optional)" },
      { "label": "C", "text": "..." },
      { "label": "D", "text": "..." }
    ],
    "correctOption": "B",
    "explanation": "(b) ... (optional)",
    "difficulty": "medium",
    "source": "PMT/NEET (optional)",
    "previousYear": 1998,
    "learningAid": {
      "meta": {
        "examPattern": "Vertical throw / free fall (optional but enrich Learn ladders)",
        "subject": "Physics",
        "chapter": "...",
        "questionType": "numerical_mcq",
        "coachMode": "formula"
      },
      "stemHighlights": [{ "term": "acceleration", "meaning": "..." }],
      "formulaLadder": [
        { "rung": 1, "title": "...", "detail": "...", "latex": "v = u + at" }
      ],
      "solutionSteps": ["..."],
      "solutionAudio": "Spoken walkthrough...",
      "commonMistake": "...",
      "examTransferTip": "..."
    }
  }
]`;

export function EditQuestionsTab({ exams, subjects }: { exams: Exam[]; subjects: Subject[] }) {
  const [examTypeFilter, setExamTypeFilter] = useState(getSelectedExamType() ?? '');
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [search, setSearch] = useState('');

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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

  function fetchQuestions(nextOffset = 0) {
    setLoading(true);
    const params: Record<string, string | number> = { limit: pageSize, offset: nextOffset };
    if (examId) params.examId = examId;
    if (subjectId) params.subjectId = subjectId;
    if (topicId) params.topicId = topicId;
    if (search) params.search = search;

    api
      .get<{ questions: QuestionRow[]; total: number }>('/questions', { params })
      .then((res) => {
        setQuestions(res.data.questions);
        setTotal(res.data.total);
        setOffset(nextOffset);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchQuestions(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, subjectId, topicId, pageSize]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchQuestions(0);
  }

  function handleSaved(updated: QuestionRow) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setEditingId(null);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>Find Questions</h2>
        <div className="admin-grid-2">
          <div>
            <label htmlFor="filter-examtype">Exam Type</label>
            <select
              id="filter-examtype"
              value={examTypeFilter}
              onChange={(e) => {
                setExamTypeFilter(e.target.value);
                setExamId('');
                setSubjectId('');
              }}
            >
              <option value="">All exam types</option>
              <option value="NEET">NEET</option>
              <option value="KCET">KCET</option>
              <option value="JEE">JEE</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-exam">Exam</label>
            <select id="filter-exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">All exams</option>
              {exams
                .filter((exam) => !examTypeFilter || exam.examType === examTypeFilter)
                .map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="admin-grid-2">
          <div>
            <label htmlFor="filter-subject">Subject</label>
            <select id="filter-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All subjects</option>
              {subjects
                .filter((s) => !examTypeFilter || s.examTypes.includes(examTypeFilter))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-topic">Chapter</label>
            <select id="filter-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={topics.length === 0}>
              <option value="">All chapters</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <form onSubmit={handleSearchSubmit}>
          <label htmlFor="filter-search">Search question text or paste a question ID</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="filter-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. permeability, or a question ID" />
            <button type="submit">Search</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Bulk Upload (JSON)</h2>
          <button type="button" className="btn-outline" onClick={() => setShowBulkUpload((v) => !v)}>
            {showBulkUpload ? 'Hide' : 'Show'}
          </button>
        </div>
        {showBulkUpload && (
          <BulkUploadPanel exams={exams} subjects={subjects} onUploaded={() => fetchQuestions(offset)} />
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            Questions {total > 0 && `(${offset + 1}–${Math.min(offset + pageSize, total)} of ${total})`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label htmlFor="page-size" style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              Show
              <select id="page-size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              per page
            </label>
            <button type="button" className="btn-outline" onClick={() => setReviewMode((v) => !v)}>
              {reviewMode ? 'Compact view' : 'Review view (full details)'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="loading-state">Loading...</p>
        ) : questions.length === 0 ? (
          <p className="empty-state">No questions match these filters.</p>
        ) : (
          <div className={reviewMode ? undefined : 'metric-list'} style={reviewMode ? { display: 'grid', gap: 12 } : undefined}>
            {questions.map((q) =>
              editingId === q.id ? (
                <QuestionEditForm
                  key={q.id}
                  question={q}
                  onCancel={() => setEditingId(null)}
                  onSaved={handleSaved}
                />
              ) : reviewMode ? (
                <QuestionReviewCard key={q.id} question={q} onEdit={() => setEditingId(q.id)} />
              ) : (
                <div className="metric-row" key={q.id} style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setEditingId(q.id)}>
                  <span className="metric-name">
                    {q.questionText.slice(0, 100)}
                    {q.questionText.length > 100 ? '...' : ''}
                    <br />
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 400,
                        color: 'var(--color-text)',
                        background: 'var(--color-surface-alt, rgba(127,127,127,0.15))',
                        padding: '2px 6px',
                        borderRadius: 4,
                        cursor: 'text',
                        userSelect: 'all',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      ID: {q.id}
                    </span>
                  </span>
                  <span className="metric-score">
                    {q.subject?.name}
                    {q.topic?.name ? ` / ${q.topic.name}` : ''} &middot; Ans: {q.correctOption}
                  </span>
                </div>
              )
            )}
          </div>
        )}

        {total > pageSize && (
          <div className="test-nav" style={{ marginTop: 16 }}>
            <button type="button" className="btn-outline" disabled={offset === 0} onClick={() => fetchQuestions(Math.max(0, offset - pageSize))}>
              Previous
            </button>
            <button type="button" disabled={offset + pageSize >= total} onClick={() => fetchQuestions(offset + pageSize)}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionReviewCard({ question, onEdit }: { question: QuestionRow; onEdit: () => void }) {
  return (
    <div className="card" style={{ background: 'var(--color-surface-alt, transparent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'var(--color-text)',
            background: 'var(--color-surface-alt, rgba(127,127,127,0.15))',
            padding: '2px 6px',
            borderRadius: 4,
            userSelect: 'all',
          }}
        >
          ID: {question.id}
        </span>
        <button type="button" className="btn-outline" onClick={onEdit}>
          Edit
        </button>
      </div>

      <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{question.questionText}</p>
      {question.questionImageUrl && (
        <img
          src={question.questionImageUrl}
          alt="Question"
          style={{ maxWidth: '100%', maxHeight: 220, border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 4 }}
        />
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        {question.options.map((o) => {
          const isCorrect = o.label === question.correctOption;
          return (
            <div
              key={o.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                border: `1px solid ${isCorrect ? 'var(--color-success, #2e7d32)' : 'var(--color-border)'}`,
                background: isCorrect ? 'var(--color-success-bg, rgba(46,125,50,0.12))' : 'transparent',
              }}
            >
              <strong>{o.label}.</strong>
              <span>{o.text}</span>
              {o.imageUrl && <img src={o.imageUrl} alt={`Option ${o.label}`} style={{ maxHeight: 50, borderRadius: 4 }} />}
              {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-success, #2e7d32)' }}>&#10003; Correct</span>}
            </div>
          );
        })}
      </div>

      {question.explanation && (
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13 }}>Explanation</strong>
          <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{question.explanation}</p>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted, #888)' }}>
        {question.subject?.name}
        {question.topic?.name ? ` / ${question.topic.name}` : ''} &middot; {question.difficulty}
      </div>
    </div>
  );
}

function ImageField({
  label,
  imageUrl,
  onChange,
}: {
  label: string;
  imageUrl?: string;
  onChange: (url: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post<{ url: string }>('/questions/upload-image', formData);
      onChange(data.url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {imageUrl && <img src={imageUrl} alt={label} style={{ maxHeight: 60, border: '1px solid var(--color-border)', borderRadius: 4 }} />}
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={uploading} style={{ fontSize: 12 }} />
      {imageUrl && (
        <button type="button" className="btn-outline" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => onChange(undefined)}>
          Remove
        </button>
      )}
      {uploading && <span style={{ fontSize: 12 }}>Uploading...</span>}
    </div>
  );
}

function QuestionEditForm({
  question,
  onCancel,
  onSaved,
}: {
  question: QuestionRow;
  onCancel: () => void;
  onSaved: (q: QuestionRow) => void;
}) {
  const [questionText, setQuestionText] = useState(question.questionText);
  const [questionImageUrl, setQuestionImageUrl] = useState(question.questionImageUrl);
  const [options, setOptions] = useState<QuestionOption[]>(question.options.map((o) => ({ ...o })));
  const [correctOption, setCorrectOption] = useState(question.correctOption);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(label: string, patch: Partial<QuestionOption>) {
    setOptions((prev) => prev.map((o) => (o.label === label ? { ...o, ...patch } : o)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put<{ question: QuestionRow }>(`/questions/${question.id}`, {
        questionText,
        questionImageUrl,
        options,
        correctOption,
        explanation: explanation || undefined,
        difficulty,
      });
      onSaved({ ...data.question, subject: question.subject, topic: question.topic });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ background: 'var(--color-surface-alt, transparent)' }} onClick={(e) => e.stopPropagation()}>
      {error && <p className="error">{error}</p>}

      <label>Question</label>
      <textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
      <ImageField label="Question image" imageUrl={questionImageUrl} onChange={setQuestionImageUrl} />

      <div style={{ marginTop: 12 }}>
        {options.map((o) => (
          <div key={o.label} style={{ marginBottom: 8 }}>
            <label htmlFor={`edit-opt-${o.label}`}>Option {o.label}</label>
            <input id={`edit-opt-${o.label}`} value={o.text} onChange={(e) => updateOption(o.label, { text: e.target.value })} />
            <ImageField label={`Option ${o.label} image`} imageUrl={o.imageUrl} onChange={(url) => updateOption(o.label, { imageUrl: url })} />
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        <div>
          <label htmlFor="edit-correct">Correct Option</label>
          <select id="edit-correct" value={correctOption} onChange={(e) => setCorrectOption(e.target.value)}>
            {options.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-difficulty">Difficulty</label>
          <select id="edit-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <label htmlFor="edit-explanation">Explanation</label>
      <textarea id="edit-explanation" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />

      <div className="test-nav" style={{ marginTop: 12 }}>
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function BulkUploadPanel({
  exams,
  subjects,
  onUploaded,
}: {
  exams: Exam[];
  subjects: Subject[];
  onUploaded: () => void;
}) {
  const [defaultExamId, setDefaultExamId] = useState('');
  const [defaultSubjectId, setDefaultSubjectId] = useState('');
  const [json, setJson] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ createdCount: number; errors: { index: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    setError(null);
    setResult(null);
    let questions: unknown;
    try {
      questions = JSON.parse(json);
    } catch {
      setError('Not valid JSON — check for a missing comma or bracket.');
      return;
    }
    if (!Array.isArray(questions)) {
      questions = [questions];
    }

    setUploading(true);
    try {
      const { data } = await api.post('/questions/bulk', {
        defaultExamId: defaultExamId || undefined,
        defaultSubjectId: defaultSubjectId || undefined,
        questions,
      });
      setResult(data);
      if (data.createdCount > 0) onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p className="subtitle">
        Paste a JSON array of questions (or a single question object). Each item can omit examId/subjectId to use the
        defaults below — handy for uploading a whole chapter at once. This is the same format the scanning pipeline's
        review files use, so you can also paste one of those directly.
      </p>

      <div className="admin-grid-2">
        <div>
          <label htmlFor="bulk-exam">Default exam (optional)</label>
          <select id="bulk-exam" value={defaultExamId} onChange={(e) => setDefaultExamId(e.target.value)}>
            <option value="">None — every item must include its own examId</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bulk-subject">Default subject (optional)</label>
          <select id="bulk-subject" value={defaultSubjectId} onChange={(e) => setDefaultSubjectId(e.target.value)}>
            <option value="">None — every item must include its own subjectId</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn-outline" onClick={() => setShowFormat((v) => !v)}>
          {showFormat ? 'Hide expected JSON format' : 'Show expected JSON format'}
        </button>
        {showFormat && (
          <pre style={{ marginTop: 8, padding: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, overflowX: 'auto', fontSize: 12 }}>
            {BULK_JSON_EXAMPLE}
          </pre>
        )}
      </div>

      <label htmlFor="bulk-json" style={{ marginTop: 8, display: 'block' }}>
        Questions JSON
      </label>
      <textarea id="bulk-json" rows={10} value={json} onChange={(e) => setJson(e.target.value)} placeholder="Paste a JSON array here..." style={{ fontFamily: 'monospace', fontSize: 12 }} />

      {error && <p className="error">{error}</p>}
      {result && (
        <p className={result.errors.length > 0 ? 'error' : 'success-message'}>
          Created {result.createdCount} question(s).
          {result.errors.length > 0 && ` ${result.errors.length} failed: ${result.errors.map((e) => `#${e.index} (${e.error})`).join(', ')}`}
        </p>
      )}

      <button type="button" disabled={uploading || !json.trim()} onClick={handleUpload} style={{ marginTop: 8 }}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
