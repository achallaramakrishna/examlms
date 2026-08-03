import { FormEvent, useState } from 'react';
import { ChatWithAI } from '../components/ChatWithAI';
import { useVectorSearch } from '../hooks/useVectorSearch';

export function AIAssistant() {
  const [query, setQuery] = useState('');
  const { results, loading, search } = useVectorSearch();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    search(query);
  }

  return (
    <div className="ai-assistant">
      <div className="page-header">
        <h1>AI Assistant</h1>
        <p className="subtitle">Ask a doubt, or search for questions similar to a topic.</p>
      </div>

      <section>
        <h2>Ask a Doubt</h2>
        <ChatWithAI />
      </section>

      <section>
        <h2>Find Similar Questions</h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic or paste a question..."
          />
          <button type="submit" disabled={loading}>
            Search
          </button>
        </form>

        {loading && <p className="loading-state">Searching...</p>}

        {results.length > 0 && (
          <ul className="search-results">
            {results.map((r) => (
              <li key={r.questionId}>
                <strong>
                  {r.subjectName}
                  {r.topicName ? ` / ${r.topicName}` : ''}
                </strong>
                <p>{r.questionText}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
