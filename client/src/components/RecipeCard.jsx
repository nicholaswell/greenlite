import React, { useEffect, useState } from 'react';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

export default function RecipeCard({ title = 'Recipe of the Week' }) {
  const [form, setForm] = useState({ name: '', image: '', url: '', ingredients: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentFeature('recipe').then(doc => {
      if (doc?.payload) setForm(doc.payload);
    }).finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    await upsertCurrentFeature('recipe', form);
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      {loading ? <p className="muted">Loading…</p> : (
        <>
          {form.image && (
            <img src={form.image} alt={form.name || 'Recipe'} style={{ width:'100%', borderRadius:8, marginBottom:12, objectFit:'cover', maxHeight:180 }} />
          )}
          <form onSubmit={save}>
            <input placeholder="Recipe name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})}/>
            <input placeholder="Image URL" value={form.image} onChange={e=>setForm({...form, image: e.target.value})}/>
            <input placeholder="Recipe link" value={form.url} onChange={e=>setForm({...form, url: e.target.value})}/>
            <textarea rows={3} placeholder="Ingredients (comma-separated)" value={form.ingredients} onChange={e=>setForm({...form, ingredients: e.target.value})}/>
            <button type="submit">Save Recipe</button>
          </form>

          <div style={{ marginTop: 12 }}>
            {form.name && <strong>{form.name}</strong>}
            {form.ingredients && (
              <ul>{form.ingredients.split(',').map((x,i)=><li key={i}>{x.trim()}</li>)}</ul>
            )}
            {form.url && <a href={form.url} target="_blank" rel="noreferrer">View recipe ↗</a>}
          </div>
        </>
      )}
    </div>
  );
}
