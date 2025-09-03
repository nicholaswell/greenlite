import React, { useEffect, useState } from 'react';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

export default function WatchlistCard({ title = 'To Watch' }) {
  const [item, setItem] = useState({ title:'', type:'movie', platform:'', link:'', image:'', notes:'' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentFeature('watch').then(doc => {
      if (doc?.payload) setItem(doc.payload);
    }).finally(()=>setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    await upsertCurrentFeature('watch', item);
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      {loading ? <p className="muted">Loading…</p> : (
        <>
          {item.image && <img src={item.image} alt={item.title} style={{ width:'100%', borderRadius:8, marginBottom:12, objectFit:'cover', maxHeight:200 }}/>}
          <form onSubmit={save}>
            <input placeholder="Title" value={item.title} onChange={e=>setItem({...item, title:e.target.value})}/>
            <div className="form-row">
              <input placeholder="Platform (e.g., Netflix)" value={item.platform} onChange={e=>setItem({...item, platform:e.target.value})}/>
              <select value={item.type} onChange={e=>setItem({...item, type:e.target.value})} style={{ height: 38, borderRadius: 8 }}>
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
              </select>
            </div>
            <input placeholder="Link (optional)" value={item.link} onChange={e=>setItem({...item, link:e.target.value})}/>
            <input placeholder="Poster/Image URL (optional)" value={item.image} onChange={e=>setItem({...item, image:e.target.value})}/>
            <textarea rows={3} placeholder="Notes (why watch, episode #, etc.)" value={item.notes} onChange={e=>setItem({...item, notes:e.target.value})}/>
            <button type="submit">Save</button>
          </form>

          {(item.title || item.platform || item.notes) && (
            <div style={{ marginTop: 12 }}>
              <strong>{item.title}</strong> {item.type === 'tv' ? '(TV)' : '(Movie)'}
              {item.platform && <div className="muted">Platform: {item.platform}</div>}
              {item.notes && <p style={{ marginTop: 8 }}>{item.notes}</p>}
              {item.link && <a href={item.link} target="_blank" rel="noreferrer">Open link ↗</a>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
