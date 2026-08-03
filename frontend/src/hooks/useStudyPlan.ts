import { useCallback, useState } from 'react';
import { api } from '../services/api';

export interface StudyPlan {
  weeklyFocus: { week: number; topics: string[]; goal: string }[];
  dailyHours: number;
  notes: string;
}

export function useStudyPlan() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ plan: StudyPlan }>('/performance/study-plan');
      setPlan(data.plan);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  }, []);

  return { plan, loading, error, generatePlan };
}
