import { useEffect, useState } from 'react';
import type { ChapterIndex, RevisionFigure, RevisionPack } from '../types/ncertRevision';
import {
  deleteLearnFigure,
  fetchFigureOverrides,
  LEARN_TRACK,
  uploadLearnFigure,
  type FigureOverrideMap,
} from '../services/ncertRevisionApi';

export function LearnFiguresTab() {
  const [index, setIndex] = useState<ChapterIndex | null>(null);
  const [slug, setSlug] = useState('');
  const [figures, setFigures] = useState<RevisionFigure[]>([]);
  const [overrides, setOverrides] = useState<FigureOverrideMap>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}ncert-revision/${LEARN_TRACK}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load chapter index');
        return r.json();
      })
      .then((data: ChapterIndex) => {
        setIndex(data);
        const firstReady = data.chapters.find((c) => c.status === 'ready');
        if (firstReady) setSlug(firstReady.slug);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setError(null);
    setMessage(null);
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}ncert-revision/${LEARN_TRACK}/${slug}.json`).then(async (r) => {
        if (!r.ok) throw new Error(`Pack not found for ${slug}`);
        return r.json() as Promise<RevisionPack>;
      }),
      fetchFigureOverrides(slug),
    ])
      .then(([pack, ovr]) => {
        if (cancelled) return;
        setFigures(pack.figures || []);
        setOverrides(ovr);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleUpload(figureId: string, file: File | undefined) {
    if (!file || !slug) return;
    setBusyId(figureId);
    setError(null);
    setMessage(null);
    try {
      const data = await uploadLearnFigure(slug, figureId, file);
      setOverrides(data.figures);
      setMessage(`Uploaded image for ${figureId}`);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Upload failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(figureId: string) {
    if (!slug) return;
    setBusyId(figureId);
    setError(null);
    setMessage(null);
    try {
      const figuresMap = await deleteLearnFigure(slug, figureId);
      setOverrides(figuresMap);
      setMessage(`Removed image for ${figureId}`);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Remove failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="learn-admin-tab">
      <p className="subtitle">
        Upload NCERT figure/table crops for Learn chapters. Students see them on the Figures tab and
        in Formula studio.
      </p>

      <label className="admin-field">
        Chapter
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {(index?.chapters || [])
            .filter((c) => c.status === 'ready')
            .map((c) => (
              <option key={c.slug} value={c.slug}>
                Ch {c.number}. {c.title}
              </option>
            ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {figures.length === 0 && !error && <p className="muted">No figures listed in this pack.</p>}

      <div className="admin-figure-list">
        {figures.map((fig) => {
          const src = overrides[fig.id]?.src || fig.src || null;
          return (
            <article key={fig.id} className="admin-figure-row">
              <div>
                <strong>
                  {fig.label} · p.{fig.ncertPage}
                </strong>
                <p className="muted">{fig.caption}</p>
                <p className="muted">{fig.placeholderText}</p>
              </div>
              <div className="admin-figure-preview">
                {src ? (
                  <img src={src} alt={fig.label} />
                ) : (
                  <div className="figure-placeholder compact">
                    <span>Page {fig.ncertPage}</span>
                    <strong>{fig.label}</strong>
                  </div>
                )}
              </div>
              <div className="admin-figure-actions">
                <label className="btn">
                  {busyId === fig.id ? 'Working…' : 'Upload'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={busyId === fig.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      void handleUpload(fig.id, file);
                    }}
                  />
                </label>
                {src && (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busyId === fig.id}
                    onClick={() => void handleRemove(fig.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
