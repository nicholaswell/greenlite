import React, { useState, useEffect } from 'react';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../api/goals';

export default function GoalsPage() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  useEffect(() => {
    getGoals().then(setItems);
  }, []);

  const add = async () => {
    const g = await createGoal({ title, dueDate: due||null });
    setItems([g,...items]);
    setTitle(''); setDue('');
  };

  const toggle = async g => {
    const updated = await updateGoal(g._id, { completed: !g.completed });
    setItems(items.map(x=>x._id===g._id?updated:x));
  };

  const remove = async id => {
    await deleteGoal(id);
    setItems(items.filter(g=>g._id!==id));
  };

  return (
    <div className="content-wrapper">
      <h3>Goals</h3>
      <ul>
        {items.map(g=>(
          <li key={g._id} style={{ marginBottom:12 }}>
            <input type="checkbox" checked={g.completed} onChange={()=>toggle(g)} />
            {g.title} {g.dueDate && `(due ${new Date(g.dueDate).toLocaleDateString()})`}
            <button onClick={()=>remove(g._id)}>Delete</button>
          </li>
        ))}
      </ul>
      <h4>Add Goal</h4>
      <input
        placeholder="Title"
        value={title}
        onChange={e=>setTitle(e.target.value)}
      />
      <input
        type="date"
        value={due}
        onChange={e=>setDue(e.target.value)}
      />
      <button onClick={add}>Add</button>
    </div>
  );
}
