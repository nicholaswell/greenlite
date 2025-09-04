import React, { useEffect, useMemo, useState } from "react";
import { getJobs, createJob, updateJob, deleteJob } from "../api/jobs";

export default function JobsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", company: "", link: "" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | responded | rejected | overdue
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getJobs();
        data.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));
        setItems(data);
      } catch (e) {
        setError("Couldn't load jobs.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const daysSince = (d) => Math.floor((Date.now() - new Date(d)) / 86400000);
  const isOverdue = (j) => !j.followUpSent && daysSince(j.appliedDate) >= 7;

  const prettyDate = (d) =>
    new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

  const add = async () => {
    const title = form.title.trim();
    if (!title) return;
    try {
      const newJob = await createJob({ ...form, appliedDate: new Date() });
      setItems((prev) => [newJob, ...prev]);
      setForm({ title: "", company: "", link: "" });
    } catch {
      setError("Couldn't add job.");
    }
  };

  // optimistic toggle
  const toggle = async (job, field) => {
    const nextVal = !job[field];
    const prev = items;
    setItems((list) => list.map((x) => (x._id === job._id ? { ...x, [field]: nextVal } : x)));
    try {
      const updated = await updateJob(job._id, { [field]: nextVal });
      setItems((list) => list.map((x) => (x._id === updated._id ? updated : x)));
    } catch {
      // revert on error
      setItems(prev);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((j) => {
      const text = `${j.title} ${j.company} ${j.link ?? ""}`.toLowerCase();
      const matchesQ = !q || text.includes(q);
      if (!matchesQ) return false;

      if (filter === "active") return !j.rejected && !j.responded;
      if (filter === "responded") return !!j.responded;
      if (filter === "rejected") return !!j.rejected;
      if (filter === "overdue") return isOverdue(j);
      return true; // all
    });
  }, [items, query, filter]);

  return (
    <div className="jobs-wrap">
      <div className="jobs-header">
        <h3>Job Applications</h3>
        <div className="row gap">
          <div className="seg-group">
            {["all", "active", "responded", "rejected", "overdue"].map((key) => (
              <button
                key={key}
                className={"seg" + (filter === key ? " active" : "")}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {key[0].toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="search"
            placeholder="Search by title, company, or link…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          No jobs yet. Add one below — track follow-ups, responses, and rejections.
        </div>
      ) : (
        <ul className="job-list">
          {filtered.map((j) => {
            const overdue = isOverdue(j);
            const age = daysSince(j.appliedDate);
            return (
              <li key={j._id} className={"job-card" + (overdue ? " overdue" : "")}>
                <div className="job-main">
                  <a
                    className="job-title"
                    href={j.link || "#"}
                    target={j.link ? "_blank" : undefined}
                    rel={j.link ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (!j.link) e.preventDefault();
                    }}
                    title={j.link || ""}
                  >
                    {j.title} {j.company ? <span className="at">@ {j.company}</span> : null}
                  </a>

                  <div className="meta">
                    <span className="chip">{prettyDate(j.appliedDate)}</span>
                    <span className="chip">{age}d since</span>
                    {j.followUpSent && <span className="chip success">Follow-up sent</span>}
                    {j.responded && <span className="chip info">Responded</span>}
                    {j.rejected && <span className="chip danger">Rejected</span>}
                    {overdue && !j.followUpSent && <span className="chip warn">Overdue</span>}
                  </div>
                </div>

                <div className="job-actions">
                  <label className="tick">
                    <input
                      type="checkbox"
                      checked={!!j.followUpSent}
                      onChange={() => toggle(j, "followUpSent")}
                    />
                    Follow-Up
                  </label>
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
                      checked={!!j.rejected}
                      onChange={() => toggle(j, "rejected")}
                    />
                    Rejected
                  </label>
                  <button className="ghost danger" onClick={() => remove(j._id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="add-form">
        <h4>Add New Job</h4>
        <div className="row gap">
          <input
            placeholder="Title"
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
            Add Job
          </button>
        </div>
      </div>
    </div>
  );
}
