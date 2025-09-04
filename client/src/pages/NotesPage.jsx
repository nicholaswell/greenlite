import React, { useEffect, useMemo, useState } from "react";
import { getNotes, createNote, updateNote, deleteNote } from "../api/notes";

// simple pastel palette for sticky notes
const COLORS = ["#FEF3C7","#E0F2FE","#FDE68A","#DCFCE7","#FCE7F3","#EDE9FE","#FFE4E6","#F1F5F9"];

export default function NotesPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [form, setForm] = useState({ content: "", section: "", color: COLORS[0] });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await getNotes();
      // sort pinned first, then newest
      data.sort((a,b) => (b.pinned - a.pinned) || (new Date(b.updatedAt||b.createdAt||0) - new Date(a.updatedAt||a.createdAt||0)));
      setItems(data);
    })();
  }, []);

  const sections = useMemo(() => {
    const s = new Set(items.map(n => (n.section || "").trim()).filter(Boolean));
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(n => {
      const inSection = sectionFilter === "all" || (n.section||"") === sectionFilter;
      const matches = !q || (n.content||"").toLowerCase().includes(q);
      return inSection && matches;
    });
  }, [items, query, sectionFilter]);

  const grouped = useMemo(() => {
    // Pinned at the very top (across all sections), then section buckets
    const pins = filtered.filter(n => n.pinned);
    const bySec = new Map();
    for (const n of filtered.filter(n => !n.pinned)) {
      const sec = (n.section || "Uncategorized");
      if (!bySec.has(sec)) bySec.set(sec, []);
      bySec.get(sec).push(n);
    }
    return { pins, sections: Array.from(bySec.entries()).sort(([a],[b]) => a.localeCompare(b)) };
  }, [filtered]);

  const startEdit = (n) => {
    setEditingId(n._id);
  };

  const saveEdit = async (id, patch) => {
    const prev = items;
    setItems(list => list.map(n => n._id===id ? {...n, ...patch} : n));
    try {
      const updated = await updateNote(id, patch);
      setItems(list => list.map(n => n._id===id ? updated : n));
    } catch {
      setItems(prev); // revert
    } finally {
      setEditingId(null);
    }
  };

  const add = async () => {
    const content = form.content.trim();
    if (!content) return;
    const note = await createNote({ content, pinned:false, section: form.section||null, color: form.color });
    setItems([note, ...items]);
    setForm({ content:"", section:"", color: COLORS[0] });
  };

  const remove = async (id) => {
    const prev = items;
    setItems(items.filter(n => n._id !== id));
    try { await deleteNote(id); } catch { setItems(prev); }
  };

  const togglePin = async (n) => {
    const prev = items;
    setItems(items.map(x => x._id===n._id ? {...x, pinned: !n.pinned} : x));
    try {
      const upd = await updateNote(n._id, { pinned: !n.pinned });
      setItems(list => list.map(x => x._id===upd._id ? upd : x));
    } catch { setItems(prev); }
  };

  return (
    <div className="notes-wrap">
      <div className="notes-toolbar">
        <h3>Notes</h3>
        <div className="toolbar-right">
          <select value={sectionFilter} onChange={(e)=>setSectionFilter(e.target.value)}>
            {sections.map(s => <option key={s} value={s}>{s === "all" ? "All sections" : s}</option>)}
          </select>
          <input
            type="search"
            placeholder="Search notes…"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Pinned */}
      {grouped.pins.length > 0 && (
        <section className="sec">
          <h4 className="sec-title">Pinned</h4>
          <div className="sticky-grid">
            {grouped.pins.map(n => (
              <NoteCard
                key={n._id}
                n={n}
                isEditing={editingId===n._id}
                onEdit={() => startEdit(n)}
                onSave={patch => saveEdit(n._id, patch)}
                onDelete={() => remove(n._id)}
                onTogglePin={() => togglePin(n)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      {grouped.sections.length === 0 && grouped.pins.length === 0 ? (
        <div className="empty">No notes yet. Add one below.</div>
      ) : (
        grouped.sections.map(([secName, notes]) => (
          <section className="sec" key={secName}>
            <h4 className="sec-title">{secName}</h4>
            <div className="sticky-grid">
              {notes.map(n => (
                <NoteCard
                  key={n._id}
                  n={n}
                  isEditing={editingId===n._id}
                  onEdit={() => startEdit(n)}
                  onSave={patch => saveEdit(n._id, patch)}
                  onDelete={() => remove(n._id)}
                  onTogglePin={() => togglePin(n)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Add */}
      <div className="add-note">
        <h4>Add Note</h4>
        <div className="add-row">
          <textarea
            value={form.content}
            onChange={(e)=>setForm({...form, content: e.target.value})}
            placeholder="Write a quick note…"
            rows={3}
          />
          <div className="add-controls">
            <div className="color-row">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={"swatch" + (form.color===c ? " active" : "")}
                  style={{ background: c }}
                  onClick={()=>setForm({...form, color:c})}
                  title={c}
                  type="button"
                />
              ))}
            </div>
            <input
              placeholder="Section (optional)"
              value={form.section}
              onChange={(e)=>setForm({...form, section: e.target.value})}
              list="sections"
            />
            <datalist id="sections">
              {sections.filter(s=>s!=="all").map(s => <option key={s} value={s} />)}
            </datalist>
            <button className="primary" onClick={add} disabled={!form.content.trim()}>
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single sticky note card */
function NoteCard({ n, isEditing, onEdit, onSave, onDelete, onTogglePin }) {
  const [draft, setDraft] = useState(n.content || "");
  const [section, setSection] = useState(n.section || "");
  const [color, setColor] = useState(n.color || "#FEF3C7");

  useEffect(() => { setDraft(n.content||""); setSection(n.section||""); setColor(n.color||color); }, [n]);

  return (
    <article className="note" style={{ background: color }}>
      <header className="note-top">
        <span className="note-sec">{section || "Uncategorized"}</span>
        <div className="note-actions">
          <button className={"pin" + (n.pinned ? " active" : "")} onClick={onTogglePin} title="Pin/unpin">📌</button>
          <button className="x" onClick={onDelete} title="Delete">×</button>
        </div>
      </header>

      {isEditing ? (
        <textarea
          className="note-edit"
          value={draft}
          onChange={(e)=>setDraft(e.target.value)}
          onBlur={()=>onSave({ content: draft, section, color })}
          onKeyDown={(e)=> e.key === "Enter" && e.metaKey ? onSave({ content: draft, section, color }) : null}
          rows={6}
          autoFocus
        />
      ) : (
        <div className="note-body" onClick={onEdit}>
          {n.content}
        </div>
      )}

      <footer className="note-footer">
        <input
          className="note-section-input"
          placeholder="Section…"
          value={section}
          onChange={(e)=>setSection(e.target.value)}
          onBlur={()=>onSave({ section })}
        />
        <input
          className="note-color"
          type="color"
          value={color}
          onChange={(e)=>{ setColor(e.target.value); onSave({ color: e.target.value }); }}
          title="Pick color"
        />
      </footer>
    </article>
  );
}
