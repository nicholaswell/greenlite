// src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';

import { getEvents } from '../api/events';
import { getGoals }  from '../api/goals';
import { getNotes }  from '../api/notes';

// Core cards
import EventsCard       from '../components/EventsCard';
import GoalsCard        from '../components/GoalsCard';
import NotesCard        from '../components/NotesCard';
import JournalCard      from '../components/JournalCard';
import JobTrackerCard   from '../components/JobTrackerCard';

// Personal widgets (DB-backed)
import WeeklyFavoritesCard from '../components/WeeklyFavorites';

// NEW
import CompletionCard from '../components/CompletionCard';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [notes,  setNotes]  = useState([]);

  // If you can derive this from your job tracker, set it here (else null for manual entry in card)
  const [jobsAppliedCount, setJobsAppliedCount] = useState(null);

  useEffect(() => {
    // Upcoming: today & tomorrow only
    getEvents().then(data => {
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      setEvents(
        (data || []).filter(e => {
          const d = new Date(e.start).toDateString();
          return d === now.toDateString() || d === tomorrow.toDateString();
        })
      );
    });

    // All goals (so we can compute completed)
    getGoals().then(data => setAllGoals(data || []));

    // Pinned notes
    getNotes().then(data => setNotes((data || []).filter(n => n.pinned)));

    // TODO: If your JobTracker exposes a quick count, set it:
    // getJobsAppliedCount().then(n => setJobsAppliedCount(n));
  }, []);

  const incompleteGoals = useMemo(
    () => allGoals.filter(g => !g.completed),
    [allGoals]
  );

  return (
    <div className="content-wrapper">
      <header className="dashboard-header">
        <h2>DASHBOARD</h2>
        <span>{new Date().toLocaleDateString()}</span>
      </header>

      {/* NEW: split the top row 50/50 */}
      <div className="dashboard-split">
        <section className="panel panel--favorites">
          <WeeklyFavoritesCard title="Weekly Favorites" />
        </section>

        <section className="panel panel--completion">
          <CompletionCard
            goals={allGoals}
            jobsAppliedCount={jobsAppliedCount} // leave null for manual input
            title="This Week – Completion"
          />
        </section>
      </div>

      {/* Existing grid for everything else */}
      <div className="cards-grid">
        <EventsCard items={events} />
        <GoalsCard  items={incompleteGoals} />
        <NotesCard  items={notes} />
        <JournalCard variant="compact" />
        <JobTrackerCard variant="compact" />
      </div>
    </div>
  );
}
