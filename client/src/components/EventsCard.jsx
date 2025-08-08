import React, { useState, useEffect } from 'react';
import { getEvents, createEvent, deleteEvent } from '../api/events';

export default function EventsCard() {
  const [items, setItems] = useState([]);
  const [text,  setText]  = useState('');

  useEffect(() => {
    getEvents().then(data => {
      // show only today & tomorrow
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const filtered = data.filter(e => {
        const d = new Date(e.start);
        return d.toDateString() === now.toDateString()
            || d.toDateString() === tomorrow.toDateString();
      });
      setItems(filtered);
    });
  }, []);

  const add = async () => {
    if (!text.trim()) return;
    const newItem = await createEvent({ title: text, start: new Date() });
    setItems([newItem, ...items]);
    setText('');
  };

  const remove = async (id) => {
    await deleteEvent(id);
    setItems(items.filter(i => i._id !== id));
  };

  return (
    <div className="card">
      <h3>Upcoming</h3>
      <ul style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {items.map(e => (
          <li key={e._id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{new Date(e.start).toLocaleString()} – {e.title}</span>
            <button onClick={() => remove(e._id)}>×</button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="New event…"
        />
        <button onClick={add}>Add</button>
      </div>
    </div>
  );
}
