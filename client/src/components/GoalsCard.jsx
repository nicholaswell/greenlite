import React, { useState, useEffect } from 'react';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../api/goals';

export default function GoalsCard() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [due,   setDue]   = useState('');

  useEffect(() => {
    getGoals().then(setItems);
  }, []);

  const add = async () => {
    if (!title.trim()) return;
    const payload = { title, dueDate: due || null };
    const newGoal = await createGoal(payload);
    setItems([newGoal, ...items]);
    setTitle(''); setDue('');
  };

  const toggle = async (goal) => {
    const updated = await updateGoal(goal._id, { completed: !goal.completed });
    setItems(items.map(g => g._id === updated._id ? updated : g));
  };

  const remove = async (id) => {
    await deleteGoal(id);
    setItems(items.filter(g => g._id !== id));
  };

  return (
    <div className="card">
      <h3>Goals</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto' }}>
        {items.map(g => (
          <li key={g._id} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={g.completed}
                onChange={() => toggle(g)}
              />
              <span style={{ marginLeft: 15 }}>{g.title}</span>
              {g.dueDate && (
                <small style={{ marginLeft: 8 }}>
                  (due {new Date(g.dueDate).toLocaleDateString()})
                </small>
              )}
            </div>
            <button onClick={() => remove(g._id)}>×</button>
          </li>
        ))}
      </ul>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="New goal…"
      />
      <input
        type="date"
        value={due}
        onChange={e => setDue(e.target.value)}
      />
      <button style={{ marginTop: 8 }} onClick={add}>Add Goal</button>
    </div>
  );
}
