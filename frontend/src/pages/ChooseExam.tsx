import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { isAdmin } from '../utils/auth';
import { EXAM_TYPES, ExamType, setSelectedExamType } from '../utils/examType';

export function ChooseExam() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const [saving, setSaving] = useState<ExamType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(examType: ExamType) {
    setSaving(examType);
    setError(null);
    try {
      await api.patch('/students/profile', { targetExamType: examType });
      setSelectedExamType(examType);
      navigate(admin ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to save your selection');
      setSaving(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Which exam are you working with?</h1>
        <p className="subtitle">
          {admin
            ? "Sets the default filter for managing questions. You still have access to everything — you can change it anytime."
            : "This decides which subjects and mock tests you'll see. You can change it anytime."}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin-grid">
        {EXAM_TYPES.map((exam) => (
          <button
            key={exam.value}
            type="button"
            className="card"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            disabled={saving !== null}
            onClick={() => handleSelect(exam.value)}
          >
            <h2 style={{ marginBottom: 8 }}>{exam.label}</h2>
            <p className="subtitle" style={{ margin: 0 }}>
              {exam.description}
            </p>
            {saving === exam.value && <p style={{ marginTop: 8 }}>Saving...</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Fetches the student's saved target exam type (if any) and caches it locally. Used on app load. */
export async function syncExamTypeFromProfile(): Promise<ExamType | null> {
  try {
    const { data } = await api.get<{ profile: { targetExamType?: ExamType } }>('/students/profile');
    if (data.profile.targetExamType) {
      setSelectedExamType(data.profile.targetExamType);
      return data.profile.targetExamType;
    }
    return null;
  } catch {
    return null;
  }
}
