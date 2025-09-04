import React, { useEffect, useMemo, useState } from "react";
import { getJobs, createJob, updateJob, deleteJob } from "../api/jobs";

export default function JobTrackerCard() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", company: "", link: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getJobs();
        data.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));
        setItems(data);
      } catch {
        setError("Couldn't load jobs.");
      }
    })();
  }, []);

  const top3 = useMemo(() => items.slice(0, 3), [items]);

  const rel = (d) => {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1w ago" : `${weeks}w ago`;
  };
  const daysSince = (d) => Math.floor((Date.now() - new Date(d)) / 86400000);
  const overdue = (j) => !j.followUpSent && daysSince(j.appliedDate) >= 7;

  const add = async () => {
    const title = form.title.trim();
    if (!title) return;
    try {
      const payload = { ...form, appliedDate: new Date() };
      const newJob = await createJob(payload);
      setItems((prev) => [newJob, ...prev].sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate)));
      setForm({ title: "", company: "", link: "" });
    } catch {
      setError("Couldn't add job.");
    }
  };

  const toggle = async (job, field) => {
    const next = !job[field];
    const prev = items;
    setItems((list) => list.map((j) => (j._id === job._id ? { ...j, [field]: next } : j)));
    try {
      const updated = await updateJob(job._id, { [field]: next });
      setItems((list) => list.map((j) => (j._id === updated._id ? updated : j)));
    } catch {
      setItems(prev); // revert
      setError("Update failed.");
    }
  };

  const remove = async (id) => {
    const prev = items;
    setItems((list) => list.filter((j) => j._id !== id));
    try {
      await deleteJob(id);
    } catch {
      setItems(prev);
      setError("Delete failed.");
    }
  };

  return (
    <div className="card jobs-card">
      <div className="card-head">
        <h3>Jobs</h3>
        {error && <span className="muted">{error}</span>}
      </div>

      {top3.length === 0 ? (
        <div className="empty">No recent applications. Add one below.</div>
      ) : (
        <ul className="jobs-mini-list">
          {top3.map((j) => (
            <li key={j._id} className={"jobs-mini-item" + (overdue(j) ? " overdue" : "")}>
              <div className="row-top">
                <a
                  className="title"
                  href={j.link || "#"}
                  target={j.link ? "_blank" : undefined}
                  rel={j.link ? "noopener noreferrer" : undefined}
                  onClick={(e) => { if (!j.link) e.preventDefault(); }}
                  title={j.link || ""}
                >
                  <span className="t">{j.title || "(untitled)"}{j.company ? <span className="at"> @ {j.company}</span> : null}</span>
                </a>
                <button className="chip ghost danger" onClick={() => remove(j._id)} aria-label="Delete">×</button>
              </div>

              <div className="row-meta">
                <span className="chip">{new Date(j.appliedDate).toLocaleDateString()} • {rel(j.appliedDate)}</span>
                {j.responded && <span className="chip info">Responded</span>}
                {j.followUpSent && <span className="chip success">Follow-up</span>}
                {overdue(j) && <span className="chip warn">Overdue</span>}
              </div>

              <div className="row-actions">
                <label className="tick">
                  <input
                    type="checkbox"
                    checked={!!j.responded}
                    onChange={() => toggle(j, "responded")}
                  />
                  Responded
                </label>
                <label className="tick">
                  <input
                    type="checkbox"
                    checked={!!j.followUpSent}
                    onChange={() => toggle(j, "followUpSent")}
                  />
                  Follow-Up
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mini-add">
        <input
          placeholder="Job title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          placeholder="Link (optional)"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="primary" onClick={add} disabled={!form.title.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}
