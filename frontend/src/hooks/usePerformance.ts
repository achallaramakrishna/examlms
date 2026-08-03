import { useEffect, useState } from 'react';
import { api } from '../services/api';

export interface PerformanceMetric {
  id: string;
  subject?: { id: string; name: string };
  topic?: { id: string; name: string };
  accuracyPercent: number;
  questionsAttempted: number;
  questionsCorrect: number;
  recordedAt: string;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [metricsRes, recRes] = await Promise.all([
          api.get<{ metrics: PerformanceMetric[] }>('/performance/metrics'),
          api.get<{ recommendation: string }>('/performance/recommendation'),
        ]);
        if (cancelled) return;
        setMetrics(metricsRes.data.metrics);
        setRecommendation(recRes.data.recommendation);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { metrics, recommendation, loading, error };
}
