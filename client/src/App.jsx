import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

import CalendarPage from './pages/CalendarPage';
import JournalPage  from './pages/JournalPage';
import JobsPage     from './pages/JobsPage';
import GoalsPage    from './pages/GoalsPage';
import NotesPage    from './pages/NotesPage';

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/journal"  element={<JournalPage />} />
            <Route path="/jobs"     element={<JobsPage />} />
            <Route path="/goals"    element={<GoalsPage />} />
            <Route path="/notes"    element={<NotesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
