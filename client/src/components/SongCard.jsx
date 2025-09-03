// src/components/SongCard.jsx
import React, { useEffect, useState } from 'react';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

async function fetchLastFm(username, apiKey) {
  if (!username || !apiKey) return null;
  const params = new URLSearchParams({
    method: 'user.gettoptracks',
    user: username,
    period: '7day',
    api_key: apiKey,
    format: 'json',
    limit: '1',
  });
  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const t = data?.toptracks?.track?.[0];
  if (!t) return null;
  return {
    name: t.name,
    artist: t.artist?.name ?? '',
    url: t.url,
    image: t.image?.slice(-1)?.[0]?.['#text'] ?? ''
  };
}

export default function SongCard({ title = 'Song of the Week' }) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
    const username = import.meta.env.VITE_LASTFM_USERNAME;
    const apiKey   = import.meta.env.VITE_LASTFM_API_KEY;

  useEffect(() => {
    (async () => {
      // 1) Try DB for current week
      const existing = await getCurrentFeature('song');
      if (existing?.payload) { setSong(existing.payload); setLoading(false); return; }

      // 2) Pull from Last.fm and cache to DB for the week
      const s = await fetchLastFm(username, apiKey);
      if (s) {
        await upsertCurrentFeature('song', s);
        setSong(s);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="card">
      <h3>{title}</h3>
      {loading && <p className="muted">Loading…</p>}
      {!loading && !song && (
        <p className="muted">Connect Last.fm to show your weekly top track.</p>
      )}
      {song && (
        <>
          {song.image && (
            <img
              src={song.image}
              alt={song.name}
              style={{ width: '100%', borderRadius: 8, marginBottom: 12, objectFit: 'cover', maxHeight: 180 }}
            />
          )}
          <div style={{ fontWeight: 600 }}>{song.name}</div>
          <div className="muted">{song.artist}</div>
          {song.url && (
            <div style={{ marginTop: 8 }}>
              <a href={song.url} target="_blank" rel="noreferrer">Open on Last.fm ↗</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
