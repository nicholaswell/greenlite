import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

function Donut({ size = 140, value = 0, target = 1, label = '' }) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const pct = Math.max(0, Math.min(100, Math.round((value / safeTarget) * 100)));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className="completion-donutWrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="completion-donut"
        role="img"
        aria-label={`${pct}% ${label}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="completion-donutPct"
        >
          {pct}%
        </text>
      </svg>
      <div className="completion-donutCaption">{label}</div>
    </div>
  );
}

const clampNonNegInt = (v, fallback = 0) => {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.round(n));
};

export default function CompletionCard({
  goals = [],
  jobsAppliedCount = null,   // if null, user can input
  title = 'This Week – Completion',
}) {
  const completedGoals = useMemo(() => goals.filter(g => g.completed).length, [goals]);

  const [goalTarget, setGoalTarget] = useState(5);
  const [jobsDone, setJobsDone] = useState(jobsAppliedCount ?? 0);
  const [jobsTarget, setJobsTarget] = useState(5);
  const [loaded, setLoaded] = useState(false);

  // Load saved targets for this week (kind: "completion")
  useEffect(() => {
    (async () => {
      try {
        const doc = await getCurrentFeature('completion'); // { payload }
        const p = doc?.payload || null;

        if (p) {
          setGoalTarget(clampNonNegInt(p.goalTarget, Math.max(completedGoals || 0, 5)));
          setJobsTarget(clampNonNegInt(p.jobsTarget, Math.max((jobsAppliedCount ?? 0), 5)));
          if (jobsAppliedCount == null && typeof p.jobsDoneManual === 'number') {
            setJobsDone(clampNonNegInt(p.jobsDoneManual, 0));
          }
        } else {
          // sensible defaults if nothing saved yet this week
          setGoalTarget(Math.max(completedGoals || 0, 5));
          setJobsTarget(Math.max((jobsAppliedCount ?? 0), 5));
        }
      } finally {
        setLoaded(true);
      }
    })();
    // We only want to run once on mount to establish initial values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save whenever values change (after initial load)
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!loaded) return;

    const payload = {
      goalTarget: clampNonNegInt(goalTarget, 0),
      jobsTarget: clampNonNegInt(jobsTarget, 0),
      // only persist manual jobsDone when it's not coming from props
      ...(jobsAppliedCount == null ? { jobsDoneManual: clampNonNegInt(jobsDone, 0) } : {}),
      timestamp: Date.now(),
    };

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsertCurrentFeature('completion', payload).catch(() => {});
    }, 400);

    return () => clearTimeout(saveTimer.current);
  }, [goalTarget, jobsTarget, jobsDone, jobsAppliedCount, loaded]);

  return (
    <div className="card completion-card">
      <h3 className="completion-title">{title}</h3>

      <div className="completion-layout">
        {/* Left column: stats + inputs */}
        <div className="completion-left">
          <section className="completion-block">
            <div className="completion-blockHeader">Goals</div>
            <div className="completion-row">
              <label className="completion-label">
                Target
                <input
                  className="completion-input"
                  type="number"
                  min={0}
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(clampNonNegInt(e.target.value, 0))}
                  inputMode="numeric"
                />
              </label>
              <div className="completion-kv">
                <span className="completion-k">Completed:</span>
                <span className="completion-v">{completedGoals}</span>
              </div>
            </div>
          </section>

          <section className="completion-block">
            <div className="completion-blockHeader">Jobs Applied</div>
            <div className="completion-row">
              <label className="completion-label">
                Target
                <input
                  className="completion-input"
                  type="number"
                  min={0}
                  value={jobsTarget}
                  onChange={(e) => setJobsTarget(clampNonNegInt(e.target.value, 0))}
                  inputMode="numeric"
                />
              </label>

              {jobsAppliedCount == null ? (
                <label className="completion-label">
                  Completed
                  <input
                    className="completion-input"
                    type="number"
                    min={0}
                    value={jobsDone}
                    onChange={(e) => setJobsDone(clampNonNegInt(e.target.value, 0))}
                    inputMode="numeric"
                  />
                </label>
              ) : (
                <div className="completion-kv">
                  <span className="completion-k">Completed:</span>
                  <span className="completion-v">{jobsAppliedCount}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column: wheels */}
        <div className="completion-wheels">
          <Donut value={completedGoals} target={goalTarget} label="Goals" />
          <Donut value={jobsAppliedCount ?? jobsDone} target={jobsTarget} label="Jobs" />
        </div>
      </div>
    </div>
  );
}
