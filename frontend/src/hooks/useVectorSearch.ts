import { useCallback, useState } from 'react';
import { semanticSearch, SemanticSearchResult } from '../services/vectorSearch';

export function useVectorSearch() {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string, options?: { examId?: string; subjectId?: string; limit?: number }) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await semanticSearch(query, options);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { results, loading, error, search };
}
