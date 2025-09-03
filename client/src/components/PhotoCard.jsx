import React, { useEffect, useState } from 'react';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

export default function PhotoCard({ title = 'Photo of the Week' }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentFeature('photo').then(doc => {
      if (doc?.payload?.url) setPhotoUrl(doc.payload.url);
    }).finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    await upsertCurrentFeature('photo', { url: photoUrl });
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      {loading ? <p className="muted">Loading…</p> : (
        <>
          {photoUrl ? (
            <img src={photoUrl} alt="Photo of the week" style={{ width:'100%', borderRadius:8, objectFit:'cover', maxHeight:240 }}/>
          ) : <p className="muted">Add an image URL to show your weekly photo.</p>}
          <form onSubmit={save}>
            <input placeholder="Image URL" value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)}/>
            <button type="submit">Save Photo</button>
          </form>
        </>
      )}
    </div>
  );
}
