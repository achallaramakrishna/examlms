import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChapterIndex } from '../types/ncertRevision';

interface SubjectTrack {
  subject: string;
  track: string;
  classLevel: string;
}

/** Each entry points at a ncert-revision/<track>/index.json. Subjects with no
 * pack yet still show a tab — the empty state below tells the student it's
 * coming soon instead of hiding the subject entirely. */
const LEARN_TRACKS: SubjectTrack[] = [
  { subject: 'Physics', track: 'physics-xi', classLevel: 'XI' },
  { subject: 'Chemistry', track: 'chemistry-xi', classLevel: 'XI' },
  { subject: 'Mathematics', track: 'maths-xi', classLevel: 'XI' },
];

export function LearnHome() {
  const [subject, setSubject] = useState(LEARN_TRACKS[0].subject);
  const [index, setIndex] = useState<ChapterIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTrack = LEARN_TRACKS.find((t) => t.subject === subject) ?? LEARN_TRACKS[0];

  useEffect(() => {
    let cancelled = false;
    setIndex(null);
    setError(null);
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}ncert-revision/${activeTrack.track}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setIndex(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTrack.track]);

  return (
    <div className="learn-home">
      <div className="page-header">
        <h1>NCERT Learn</h1>
        <p className="subtitle">
          Class XI — pick a subject, then a chapter. Revise NCERT lines, formulas, flashcards, then climb
          the problem ladder before MCQs.
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="subject-tabs" role="tablist" aria-label="Subjects">
        {LEARN_TRACKS.map((t) => (
          <button
            key={t.subject}
            type="button"
            className={t.subject === subject ? 'active' : ''}
            onClick={() => setSubject(t.subject)}
          >
            {t.subject}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading-state">Loading chapters...</p>
      ) : !index || index.chapters.length === 0 ? (
        <div className="card empty-state">{subject} chapters are coming soon — check back later.</div>
      ) : (
        <div className="chapter-grid">
          {index.chapters.map((ch) =>
            ch.status === 'ready' ? (
              <Link
                key={ch.slug}
                to={`/learn/${activeTrack.track}/${ch.slug}`}
                className="chapter-card learn-chapter-card"
              >
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
