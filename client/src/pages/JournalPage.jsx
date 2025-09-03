import React, { useEffect, useMemo, useRef, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry
} from '../api/journal';

export default function JournalPage() {
  const [allEntries, setAllEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState(null); // editing an existing one
  const [creating, setCreating] = useState(false);          // composing a new one
  const [text, setText] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    (async () => {
      const data = await getJournalEntries();
      data.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
      setAllEntries(data);
    })();
  }, []);

  const dayEntries = useMemo(() => {
    const dStr = selectedDate.toDateString();
    return allEntries.filter(e => new Date(e.entryDate).toDateString() === dStr);
  }, [allEntries, selectedDate]);

  const openEntry = (e) => {
    setCreating(false);
    setSelectedEntry(e);
    setText(e.content || '');
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const startNew = () => {
    setCreating(true);
    setSelectedEntry(null);
    setText('');
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const cancel = () => {
    setCreating(false);
    setSelectedEntry(null);
    setText('');
  };

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (selectedEntry) {
      const updated = await updateJournalEntry(selectedEntry._id, { content: trimmed });
      setAllEntries(list => list.map(i => (i._id === updated._id ? updated : i)));
      setSelectedEntry(updated);
      setCreating(false);
    } else {
      const created = await createJournalEntry({ content: trimmed, entryDate: selectedDate });
      setAllEntries(list => [created, ...list]);
      setSelectedEntry(created);
      setCreating(false);
    }
  };

  const remove = async (id) => {
    await deleteJournalEntry(id);
    setAllEntries(list => list.filter(e => e._id !== id));
    if (selectedEntry?._id === id) cancel();
  };

  const time = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const snippet = (s = '') => (s.length > 120 ? s.slice(0, 120).trim() + '…' : s);

  return (
    <div className="journal-shell">
      <aside className="journal-left">
        <div className="journal-left-head">
          <h2>Journal</h2>
          <button className="primary" onClick={startNew}>+ New Entry</button>
        </div>

        <Calendar onChange={setSelectedDate} value={selectedDate} />

        <div className="journal-list-header">
          <h4>{selectedDate.toDateString()}</h4>
          <span className="muted">{dayEntries.length} entr{dayEntries.length === 1 ? 'y' : 'ies'}</span>
        </div>

        <ul className="journal-list">
          {dayEntries.length === 0 && <li className="empty">No entries for this day.</li>}
          {dayEntries.map(e => (
            <li
              key={e._id}
              className={'journal-list-item ' + (selectedEntry?._id === e._id ? 'active' : '')}
              onClick={() => openEntry(e)}
            >
              <div className="row">
                <strong className="title">{snippet(e.content?.split('\n')[0]) || '(Untitled)'}</strong>
                <span className="time">{time(e.entryDate)}</span>
              </div>
              <div className="preview">{snippet(e.content)}</div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="journal-main">
        {(selectedEntry || creating || text !== '') ? (
          <>
            <div className="journal-main-bar">
              <div>
                <h3>{selectedEntry ? 'Edit Entry' : 'New Entry'}</h3>
                <small className="muted">
                  {selectedEntry
                    ? new Date(selectedEntry.entryDate).toLocaleString()
                    : selectedDate.toLocaleString()}
                </small>
              </div>
              <div className="actions" style={{ display: 'flex', gap: 8 }}>
                {(creating || selectedEntry) && (
                  <button onClick={cancel}>Cancel</button>
                )}
                {selectedEntry && (
                  <button className="danger" onClick={() => remove(selectedEntry._id)}>
                    Delete
                  </button>
                )}
                <button className="primary" onClick={save}>
                  {selectedEntry ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </div>

            <textarea
              ref={editorRef}
              className="journal-editor"
              placeholder="Write your entry…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        ) : (
          <div className="journal-empty-state">
            <p>Select an entry on the left or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
