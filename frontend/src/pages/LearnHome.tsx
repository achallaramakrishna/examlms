import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChapterIndex } from '../types/ncertRevision';

export function LearnHome() {
  const [index, setIndex] = useState<ChapterIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}ncert-revision/physics-xi/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load chapter list');
        return r.json();
      })
      .then(setIndex)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="learn-home">
      <div className="page-header">
        <h1>NCERT Learn</h1>
        <p className="subtitle">
          Physics Class XI — revise NCERT lines, formulas, flashcards, then climb the problem ladder before MCQs.
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {!index && !error && <p className="loading-state">Loading chapters...</p>}

      {index && (
        <div className="chapter-grid">
          {index.chapters.map((ch) =>
            ch.status === 'ready' ? (
              <Link key={ch.slug} to={`/learn/${ch.slug}`} className="chapter-card learn-chapter-card">
                <span className="chapter-name">
                  Ch {ch.number}. {ch.title}
                </span>
                <span className="chapter-count">Formulas · Flashcards · Ladder</span>
              </Link>
            ) : (
              <div key={ch.slug} className="chapter-card learn-chapter-card coming-soon" aria-disabled>
                <span className="chapter-name">
                  Ch {ch.number}. {ch.title}
                </span>
                <span className="chapter-count">Coming soon</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
