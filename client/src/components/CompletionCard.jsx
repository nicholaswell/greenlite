import React, { useMemo, useState } from 'react';

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

export default function CompletionCard({
  goals = [],
  jobsAppliedCount = null,   // if null, user can input
  title = 'This Week – Completion',
}) {
  const completedGoals = useMemo(() => goals.filter(g => g.completed).length, [goals]);
  const [goalTarget, setGoalTarget] = useState(Math.max(completedGoals || 0, 5));

  const [jobsDone, setJobsDone] = useState(jobsAppliedCount ?? 0);
  const [jobsTarget, setJobsTarget] = useState(Math.max(jobsDone || 0, 5));

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
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
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
                  onChange={(e) => setJobsTarget(Number(e.target.value))}
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
                    onChange={(e) => setJobsDone(Number(e.target.value))}
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
