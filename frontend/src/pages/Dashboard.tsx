import { usePerformance } from '../hooks/usePerformance';

export function Dashboard() {
  const { metrics, recommendation, loading, error } = usePerformance();

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Your Dashboard</h1>
        <p className="subtitle">Track your progress and pick up where you left off.</p>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading your progress...</p>
      ) : (
        <>
          {recommendation && (
            <section className="recommendation-card">
              <h2>Advisor Recommendation</h2>
              <p>{recommendation}</p>
            </section>
          )}

          <section>
            <h2 style={{ marginBottom: 14 }}>Recent Performance</h2>
            {metrics.length > 0 ? (
              <div className="metric-list">
                {metrics.map((m) => (
                  <div className="metric-row" key={m.id}>
                    <span className="metric-name">{m.subject?.name ?? 'Overall'}</span>
                    <span className="metric-score">
                      {Math.round(m.accuracyPercent)}% &middot; {m.questionsCorrect}/{m.questionsAttempted} correct
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card empty-state">
                No mock tests yet — <a href="/exams">browse the exam library</a> to get started.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
