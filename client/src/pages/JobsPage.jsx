import React, { useState, useEffect } from 'react';
import { getJobs, createJob, updateJob, deleteJob } from '../api/jobs';

export default function JobsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title:'', company:'', link:'' });

  useEffect(() => {
    getJobs().then(setItems);
  }, []);

  const add = async () => {
    if (!form.title) return;
    const job = await createJob({ ...form, appliedDate: new Date() });
    setItems([job, ...items]);
    setForm({ title:'', company:'', link:'' });
  };

  const toggle = async (j, field) => {
    const updated = await updateJob(j._id, { [field]: !j[field] });
    setItems(items.map(x=>x._id===j._id?updated:x));
  };

  const remove = async id => {
    await deleteJob(id);
    setItems(items.filter(j=>j._id!==id));
  };

  const isOverdue = j => {
    return !j.followUpSent && (Date.now() - new Date(j.appliedDate) > 7*24*3600*1000);
  };

  return (
    <div className="content-wrapper">
      <h3>Job Applications</h3>
      <ul>
        {items.map(j=>(
          <li key={j._id} style={{ marginBottom:12, background: isOverdue(j)?'#fee2e2':'transparent' }}>
            <a href={j.link} target="_blank" rel="noopener noreferrer">
              {j.title} @ {j.company}
            </a>
            <div>
              Applied: {new Date(j.appliedDate).toLocaleDateString()}
            </div>
            <label>
              <input type="checkbox" checked={j.followUpSent} onChange={()=>toggle(j,'followUpSent')} />
              Follow-Up Sent
            </label>
            <label style={{ marginLeft:8 }}>
              <input type="checkbox" checked={j.responded} onChange={()=>toggle(j,'responded')} />
              Responded
            </label>
            <label style={{ marginLeft:8 }}>
              <input type="checkbox" checked={j.rejected} onChange={()=>toggle(j,'rejected')} />
              Rejected
            </label>
            <button onClick={()=>remove(j._id)}>Delete</button>
          </li>
        ))}
      </ul>
      <h4>Add New Job</h4>
      <input
        placeholder="Title"
        value={form.title}
        onChange={e=>setForm({...form,title:e.target.value})}
      />
      <input
        placeholder="Company"
        value={form.company}
        onChange={e=>setForm({...form,company:e.target.value})}
      />
      <input
        placeholder="Link"
        value={form.link}
        onChange={e=>setForm({...form,link:e.target.value})}
      />
      <button onClick={add}>Add Job</button>
    </div>
  );
}
