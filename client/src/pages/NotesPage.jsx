import React, { useState, useEffect } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../api/notes';

export default function NotesPage() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    getNotes().then(setItems);
  }, []);

  const save = async () => {
    if (editing) {
      const upd = await updateNote(editing._id, { content: text, pinned: editing.pinned });
      setItems(items.map(n=>n._id===upd._id?upd:n));
      setEditing(null);
    } else {
      const newItem = await createNote({ content: text, pinned: false });
      setItems([newItem, ...items]);
    }
    setText('');
  };

  const remove = async id => {
    await deleteNote(id);
    setItems(items.filter(n=>n._id!==id));
  };

  const togglePin = async n => {
    const upd = await updateNote(n._id, { pinned: !n.pinned });
    setItems(items.map(x=>x._id===upd._id?upd:x));
  };

  const startEdit = n => {
    setEditing(n);
    setText(n.content);
  };

  return (
    <div className="content-wrapper">
      <h3>Notes</h3>
      <ul>
        {items.sort((a,b)=>b.pinned - a.pinned).map(n=>(
          <li key={n._id} style={{ 
            marginBottom:12,
            background: n.pinned ? '#f0fdf4' : 'transparent'
          }}>
            <span onClick={()=>startEdit(n)} style={{ cursor:'pointer' }}>
              {n.content}
            </span>
            <button onClick={()=>togglePin(n)}>{n.pinned ? '📌' : '📍'}</button>
            <button onClick={()=>remove(n._id)}>×</button>
          </li>
        ))}
      </ul>
      <input
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={editing ? 'Edit note…' : 'New note…'}
      />
      <button onClick={save}>{editing ? 'Update' : 'Add'} Note</button>
    </div>
  );
}
