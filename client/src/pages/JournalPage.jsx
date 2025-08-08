import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry
} from '../api/journal';

export default function JournalPage() {
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    getJournalEntries().then(data => {
      setEntries(data.filter(j =>
        new Date(j.entryDate).toDateString() === date.toDateString()
      ));
    });
  }, [date]);

  const save = async () => {
    if (editing) {
      const updated = await updateJournalEntry(editing._id, { content });
      setEntries(entries.map(e=>e._id===updated._id?updated:e));
      setEditing(null);
    } else {
      const newItem = await createJournalEntry({ content, entryDate: date });
      setEntries([newItem, ...entries]);
    }
    setContent('');
  };

  const remove = async id => {
    await deleteJournalEntry(id);
    setEntries(entries.filter(e=>e._id!==id));
  };

  const startEdit = e => {
    setEditing(e);
    setContent(e.content);
  };

  return (
    <div className="content-wrapper">
      <Calendar onChange={setDate} value={date} />
      <h3>Journal on {date.toDateString()}</h3>
      <textarea
        rows={4}
        value={content}
        onChange={e=>setContent(e.target.value)}
        placeholder="Write or edit…"
      />
      <button onClick={save}>{editing ? 'Update' : 'Add'} Entry</button>
      <ul>
        {entries.map(e=>(
          <li key={e._id}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <small>{new Date(e.entryDate).toLocaleTimeString()}</small>
              <div>
                <button onClick={()=>startEdit(e)}>✎</button>
                <button onClick={()=>remove(e._id)}>×</button>
              </div>
            </div>
            <p>{e.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
