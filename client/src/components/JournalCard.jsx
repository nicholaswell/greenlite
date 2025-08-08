import React, { useState, useEffect } from 'react';
import { getJournalEntries, createJournalEntry, deleteJournalEntry } from '../api/journal';

export default function JournalCard() {
  const [items, setItems] = useState([]);
  const [entry, setEntry] = useState('');

  useEffect(() => {
    getJournalEntries().then(setItems);
  }, []);

  const add = async () => {
    if (!entry.trim()) return;
    const newItem = await createJournalEntry({ content: entry, entryDate: new Date() });
    setItems([newItem, ...items]);
    setEntry('');
  };

  const remove = async (id) => {
    await deleteJournalEntry(id);
    setItems(items.filter(j => j._id !== id));
  };

  return (
    <div className="card">
      <h3>Journal</h3>
      <textarea
        rows={4}
        style={{ width: '100%', marginBottom: 8 }}
        value={entry}
        onChange={e => setEntry(e.target.value)}
        placeholder="Write your thoughts…"
      />
      <button onClick={add}>Save Entry</button>
      <ul style={{ marginTop: 12, flex: 1, overflowY: 'auto' }}>
        {items.map(j => (
          <li key={j._id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <small>{new Date(j.entryDate).toLocaleString()}</small>
              <button onClick={() => remove(j._id)}>×</button>
            </div>
            <p>{j.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
