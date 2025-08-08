import React, { useState, useEffect } from 'react';
import { getNotes, createNote, deleteNote } from '../api/notes';

export default function NotesCard() {
  const [items, setItems] = useState([]);
  const [note,  setNote]  = useState('');

  useEffect(() => {
    getNotes().then(setItems);
  }, []);

  const add = async () => {
    if (!note.trim()) return;
    const newItem = await createNote({ content: note });
    setItems([newItem, ...items]);
    setNote('');
  };

  const remove = async (id) => {
    await deleteNote(id);
    setItems(items.filter(n => n._id !== id));
  };

  return (
    <div className="card">
      <h3>Notes</h3>
      <ul style={{ flex: 1, overflowY: 'auto' }}>
        {items.map(n => (
          <li key={n._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>{n.content}</span>
            <button onClick={() => remove(n._id)}>×</button>
          </li>
        ))}
      </ul>
      <input
        style={{ width: '100%', marginBottom: 8 }}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Quick note…"
      />
      <button onClick={add}>Add Note</button>
    </div>
  );
}
