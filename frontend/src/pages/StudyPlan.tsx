import { useEffect } from 'react';
import { useStudyPlan } from '../hooks/useStudyPlan';

export function StudyPlan() {
  const { plan, loading, error, generatePlan } = useStudyPlan();

  useEffect(() => {
    generatePlan();
  }, [generatePlan]);

  return (
    <div className="study-plan">
      <div className="page-header">
        <h1>Your Study Plan</h1>
        <p className="subtitle">AI-generated, based on your target exam and recent performance.</p>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Generating your plan...</p>
      ) : (
        plan && (
          <>
            <p className="study-plan-meta">
              Recommended pace: <strong>{plan.dailyHours}h/day</strong> &middot; {plan.notes}
            </p>
            <ol>
              {plan.weeklyFocus.map((week) => (
                <li className="study-plan-week" key={week.week}>
                  <strong>Week {week.week}</strong> &mdash; {week.goal}
                  <ul>
                    {week.topics.map((topic) => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </>
        )
      )}

      <button type="button" className="btn-outline" onClick={generatePlan} disabled={loading} style={{ marginTop: 20 }}>
        Regenerate Plan
      </button>
    </div>
  );
}
