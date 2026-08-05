import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { isAdmin } from '../utils/auth';
import {
  EXAM_TYPES,
  ExamType,
  examTypeLabel,
  getSelectedExamType,
  setSelectedExamType,
} from '../utils/examType';

export function ChooseExam() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const current = getSelectedExamType();
  const [saving, setSaving] = useState<ExamType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(examType: ExamType, comingSoon?: boolean) {
    if (comingSoon) return;
    setSaving(examType);
    setError(null);
    try {
      await api.patch('/students/profile', { targetExamType: examType });
      setSelectedExamType(examType);
      navigate(admin ? '/admin' : '/practice');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to save your selection');
      setSaving(null);
    }
  }

  return (
    <div className="exam-gate">
      <div className="exam-gate-top">
        <div className="topbar-brand">ExamLMS</div>
        <ThemeToggle />
      </div>

      <div className="exam-gate-body">
        <div className="page-header">
          <h1>Choose your exam</h1>
          <p className="subtitle">
            Pick one exam track first. Exams, Practice, and Study Plan will only show content for that track.
          </p>
          {current && (
            <p className="subtitle" style={{ marginTop: 8 }}>
              Currently selected: <strong>{examTypeLabel(current)}</strong>
            </p>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="exam-gate-grid">
          {EXAM_TYPES.map((exam) => {
            const selected = current === exam.value;
            const disabled = !!exam.comingSoon || saving !== null;
            return (
              <button
                key={exam.value}
                type="button"
                className={`exam-gate-card${selected ? ' selected' : ''}${exam.comingSoon ? ' coming-soon' : ''}`}
                disabled={disabled && !selected}
                onClick={() => handleSelect(exam.value, exam.comingSoon)}
              >
                <div className="exam-gate-card-head">
                  <h2>{exam.label}</h2>
                  {exam.comingSoon ? (
                    <span className="badge badge-warning">Coming soon</span>
                  ) : selected ? (
                    <span className="badge badge-success">Selected</span>
                  ) : (
                    <span className="badge badge-neutral">Available</span>
                  )}
                </div>
                <p>{exam.description}</p>
                {!exam.comingSoon && (
                  <span className="exam-gate-cta">
                    {saving === exam.value ? 'Opening…' : selected ? 'Continue' : 'Select & continue'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
