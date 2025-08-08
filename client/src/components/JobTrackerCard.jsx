import React, { useState, useEffect } from 'react';
import { getJobs, createJob, updateJob, deleteJob } from '../api/jobs';

export default function JobTrackerCard() {
  const [items, setItems] = useState([]);
  const [form, setForm]   = useState({ title: '', company: '', link: '' });

  useEffect(() => {
    getJobs().then(setItems);
  }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      appliedDate: new Date()
    };
    const newJob = await createJob(payload);
    setItems([newJob, ...items]);
    setForm({ title: '', company: '', link: '' });
  };

  const toggleField = async (job, field) => {
    const updated = await updateJob(job._id, { [field]: !job[field] });
    setItems(items.map(j => j._id === updated._id ? updated : j));
  };

  const remove = async (id) => {
    await deleteJob(id);
    setItems(items.filter(j => j._id !== id));
  };

  return (
    <div className="card">
      <h3>Jobs</h3>
      <ul style={{ flex: 1, overflowY: 'auto' }}>
        {items.map(j => (
          <li key={j._id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <a href={j.link} target="_blank" rel="noopener noreferrer">{j.title} @ {j.company}</a>
              <button onClick={() => remove(j._id)}>×</button>
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Applied: {new Date(j.appliedDate).toLocaleDateString()}
              {' • '}
              <label>
                <input type="checkbox" checked={j.responded} onChange={() => toggleField(j, 'responded')} />
                Responded
              </label>
              {' • '}
              <label>
                <input type="checkbox" checked={j.followUpSent} onChange={() => toggleField(j, 'followUpSent')} />
                Follow-Up
              </label>
            </div>
          </li>
        ))}
      </ul>
      <input
        placeholder="Job title"
        value={form.title}
        onChange={e => setForm({...form, title: e.target.value})}
      />
      <input
        placeholder="Company"
        value={form.company}
        onChange={e => setForm({...form, company: e.target.value})}
      />
      <input
        placeholder="Link"
        value={form.link}
        onChange={e => setForm({...form, link: e.target.value})}
      />
      <button style={{ marginTop: 8 }} onClick={add}>Add Job</button>
    </div>
  )
}
