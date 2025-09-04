import React, { useEffect, useMemo, useState } from "react";
import { getGoals, createGoal, updateGoal, deleteGoal } from "../api/goals";

export default function GoalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(""); // yyyy-mm-dd
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active"); // all|active|completed|overdue|soon
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getGoals();
        setItems(sortGoals(data));
      } catch {
        setError("Couldn't load goals.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortGoals = (arr) =>
    [...arr].sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd; // earlier first
      return (a.completed === b.completed ? 0 : a.completed ? 1 : -1); // incomplete first
    });

  const todayYMD = () => new Date().toISOString().slice(0, 10);
  const daysLeft = (d) => Math.floor((new Date(d) - startOfDay(new Date())) / 86400000);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isOverdue = (g) => g.dueDate && daysLeft(g.dueDate) < 0 && !g.completed;
  const isSoon = (g) => g.dueDate && daysLeft(g.dueDate) >= 0 && daysLeft(g.dueDate) <= 7 && !g.completed;

  const prettyDate = (d) =>
    new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

  // Add
  const add = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      const g = await createGoal({ title: t, dueDate: due || null });
      setItems((prev) => sortGoals([g, ...prev]));
      setTitle(""); setDue("");
    } catch {
      setError("Couldn't add goal.");
    }
  };

  // Optimistic toggle complete
  const toggle = async (g) => {
    const prev = items;
    const optimistic = { ...g, completed: !g.completed };
    setItems(sortGoals(items.map((x) => (x._id === g._id ? optimistic : x))));
    try {
      const updated = await updateGoal(g._id, { completed: optimistic.completed });
      setItems((list) => sortGoals(list.map((x) => (x._id === g._id ? updated : x))));
    } catch {
      setItems(prev);
      setError("Update failed.");
    }
  };

  // Inline edit (title or due)
  const edit = async (g, patch) => {
    const prev = items;
    setItems(sortGoals(items.map((x) => (x._id === g._id ? { ...x, ...patch } : x))));
    try {
      const updated = await updateGoal(g._id, patch);
      setItems((list) => sortGoals(list.map((x) => (x._id === g._id ? updated : x))));
    } catch {
      setItems(prev);
      setError("Update failed.");
    }
  };

  const remove = async (id) => {
    const prev = items;
    setItems(items.filter((g) => g._id !== id));
    try {
      await deleteGoal(id);
    } catch {
      setItems(prev);
      setError("Delete failed.");
    }
  };

  // Filter + search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((g) => {
      const matchesQ = !q || g.title.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (filter === "all") return true;
      if (filter === "active") return !g.completed;
      if (filter === "completed") return !!g.completed;
      if (filter === "overdue") return isOverdue(g);
      if (filter === "soon") return isSoon(g);
      return true;
    });
  }, [items, query, filter]);

  // Buckets
  const bucketOf = (g) => {
    if (!g.dueDate) return "No Due Date";
    const dl = daysLeft(g.dueDate);
    if (dl < 0) return "Overdue";
    if (dl === 0) return "Today";
    if (dl <= 7) return "This Week";
    return "Later";
  };

  const buckets = useMemo(() => {
    const map = new Map();
    for (const g of filtered) {
      const key = bucketOf(g);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(g);
    }
    // enforce bucket order
    const order = ["Overdue", "Today", "This Week", "Later", "No Due Date"];
    return order.filter((k) => map.has(k)).map((k) => ({ name: k, items: map.get(k) }));
  }, [filtered]);

  const clearCompleted = async () => {
    const completedIds = items.filter((g) => g.completed).map((g) => g._id);
    if (completedIds.length === 0) return;
    const prev = items;
    setItems(items.filter((g) => !g.completed));
    try {
      await Promise.all(completedIds.map((id) => deleteGoal(id)));
    } catch {
      setItems(prev);
      setError("Clear completed failed.");
    }
  };

  return (
    <div className="goals-wrap">
      <div className="goals-header">
        <h3>Goals</h3>
        <div className="row gap">
          <div className="seg-group">
            {["all", "active", "completed", "overdue", "soon"].map((key) => (
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
            placeholder="Search goals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="ghost" onClick={clearCompleted}>Clear Completed</button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : buckets.length === 0 ? (
        <div className="empty">No goals yet. Add one below.</div>
      ) : (
        buckets.map(({ name, items }) => (
          <section key={name} className="bucket">
            <h4 className="bucket-title">{name}</h4>
            <ul className="goal-list">
              {items.map((g) => {
                const overdue = isOverdue(g);
                const soon = isSoon(g);
                return (
                  <li key={g._id} className={"goal-row" + (overdue ? " overdue" : "")}>
                    <label className="tick">
                      <input
                        type="checkbox"
                        checked={!!g.completed}
                        onChange={() => toggle(g)}
                        aria-label={g.completed ? "Mark incomplete" : "Mark complete"}
                      />
                    </label>

                    <input
                      className={"goal-title" + (g.completed ? " done" : "")}
                      value={g.title}
                      onChange={(e) => edit(g, { title: e.target.value })}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        if (!t) edit(g, { title: "(untitled)" });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />

                    <div className="due">
                      <input
                        type="date"
                        value={g.dueDate ? new Date(g.dueDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => edit(g, { dueDate: e.target.value || null })}
                        className="date"
                        aria-label="Due date"
                      />
                      {g.dueDate && !g.completed && (
                        <span className={"chip " + (overdue ? "danger" : soon ? "warn" : "")}>
                          {overdue
                            ? `${Math.abs(daysLeft(g.dueDate))}d overdue`
                            : daysLeft(g.dueDate) === 0
                            ? "Due today"
                            : `${daysLeft(g.dueDate)}d left`}
                        </span>
                      )}
                      {g.completed && <span className="chip success">Done</span>}
                    </div>

                    <button className="ghost danger" onClick={() => remove(g._id)}>
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <div className="add-form">
        <h4>Add Goal</h4>
        <div className="row gap">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            min={todayYMD()}
          />
          <button className="primary" onClick={add} disabled={!title.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
