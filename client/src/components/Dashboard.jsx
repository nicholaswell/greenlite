// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { getEvents } from '../api/events';
import { getJournalEntries } from '../api/journal';
import { getJobs } from '../api/jobs';
import { getGoals } from '../api/goals';
import { getNotes } from '../api/notes';

import EventsCard       from './EventsCard';
import JournalCard      from './JournalCard';
import JobTrackerCard   from './JobTrackerCard';
import GoalsCard        from './GoalsCard';
import NotesCard        from './NotesCard';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [journal, setJournal] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    // Upcoming events
    getEvents().then(data => {
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
      setEvents(data.filter(e => {
        const d=new Date(e.start);
        return d.toDateString()===now.toDateString()||d.toDateString()===tomorrow.toDateString();
      }));
    });
    // Latest journal entry
    getJournalEntries().then(data=>setJournal(data.slice(0,1)));
    // Jobs needing follow-up (week passed & no follow-up)
    getJobs().then(data => {
      const now=Date.now();
      setJobs(data.filter(j => {
        if (j.followUpSent) return false;
        const applied=new Date(j.appliedDate).getTime();
        return now - applied > 7*24*3600*1000; // >7 days
      }));
    });
    // Incomplete goals
    getGoals().then(data=>setGoals(data.filter(g=>!g.completed)));
    // Pinned notes (mark pin in the model)
    getNotes().then(data=>setNotes(data.filter(n=>n.pinned)));
  }, []);

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <h2>DASHBOARD</h2>
        <span>{new Date().toLocaleDateString()}</span>
      </header>
      <div className="cards-grid">
        <EventsCard items={events} />
        <JournalCard items={journal} />
        <JobTrackerCard items={jobs} />
        <GoalsCard items={goals} />
        <NotesCard items={notes} />
      </div>
    </div>
  );
}
