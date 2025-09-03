import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentFeature, upsertCurrentFeature } from '../api/features';

/** ===== Week helpers (Sunday → Saturday, local time) ===== */
function startOfWeekSunday(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - dow); // back to Sunday
  return d;
}
function endOfWeekSunday(dateLike) {
  const s = startOfWeekSunday(dateLike);
  const e = new Date(s);
  e.setDate(s.getDate() + 6); // Saturday
  e.setHours(23, 59, 59, 999);
  return e;
}
function weekLabelFromRange(fromISO, toISO) {
  const s = fromISO ? new Date(fromISO) : new Date();
  const e = toISO ? new Date(toISO) : endOfWeekSunday(s);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = s.getMonth() === e.getMonth();

  const fmtMD = { month: 'short', day: 'numeric' };
  const fmtY = { year: 'numeric' };
  const sMD = s.toLocaleDateString(undefined, fmtMD);
  const eMD = e.toLocaleDateString(undefined, fmtMD);
  const sY = s.toLocaleDateString(undefined, fmtY);

  if (!sameYear) {
    const eY = e.toLocaleDateString(undefined, fmtY);
    return `${sMD}, ${sY} – ${eMD}, ${eY}`;
  }
  if (!sameMonth) {
    return `${sMD} – ${eMD}, ${sY}`;
  }
  return `${sMD}–${eMD}, ${sY}`;
}

/** ===== Last.fm: weekly (Sun→now) top track from your own scrobbles ===== */
async function fetchTopFromRecentSinceSunday({ username, apiKey }) {
  if (!username || !apiKey) return null;

  const isPlaceholder = (url = '') =>
    url.includes('2a96cbd8b46e442fc41c2b86b821562f');

  const pickImage = (images = []) => {
    const order = ['extralarge', 'large', 'medium', 'small'];
    for (const size of order) {
      const hit = images.find(i => i.size === size)?.['#text'];
      if (hit) return hit;
    }
    return images.at(-1)?.['#text'] || '';
  };

  const call = async (params) => {
    const qs = new URLSearchParams({ format: 'json', api_key: apiKey, ...params });
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${qs}`);
    if (!res.ok) return null;
    return res.json();
  };

  const weekStartLocal = startOfWeekSunday(new Date());
  const weekEndLocal = endOfWeekSunday(new Date());
  const fromEpoch = Math.floor(weekStartLocal.getTime() / 1000);
  const toEpoch = Math.floor(Date.now() / 1000);

  const counts = new Map();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const recent = await call({
      method: 'user.getrecenttracks',
      user: username,
      from: String(fromEpoch),
      to: String(toEpoch),
      limit: '200',
      page: String(page),
      extended: '1',
    });
    const attr = recent?.recenttracks?.['@attr'];
    totalPages = Number(attr?.totalPages || 1);

    const tracks = recent?.recenttracks?.track || [];
    for (const t of tracks) {
      const uts = Number(t?.date?.uts || 0);
      if (!uts) continue;

      const name = (t?.name || '').trim();
      const artist = (t?.artist?.name || t?.artist?.['#text'] || '').trim();
      if (!name || !artist) continue;

      const key = `${artist.toLowerCase()}|||${name.toLowerCase()}`;
      const prev = counts.get(key);
      if (!prev) {
        counts.set(key, {
          count: 1,
          lastTs: uts,
          sample: {
            name,
            artist,
            url: t?.url || '',
            image: pickImage(t?.image || []),
          },
        });
      } else {
        prev.count += 1;
        if (uts > prev.lastTs) prev.lastTs = uts;
      }
    }
    page += 1;
  }

  if (!counts.size) {
    return {
      name: '',
      artist: '',
      url: '',
      image: '',
      weekStart: weekStartLocal.toISOString(),
      weekEnd: weekEndLocal.toISOString(),
    };
  }

  let best = null;
  for (const [, v] of counts.entries()) {
    if (!best || v.count > best.count || (v.count === best.count && v.lastTs > best.lastTs)) {
      best = v;
    }
  }

  let { name, artist, url, image } = best.sample;

  if (name && artist) {
    const info = await call({
      method: 'track.getInfo',
      track: name,
      artist: artist,
      autocorrect: '1',
    });
    const ti = info?.track;
    if (ti) {
      url = url || ti.url || '';
      const pickImage2 = (images = []) => {
        const order = ['extralarge', 'large', 'medium', 'small'];
        for (const size of order) {
          const hit = images.find(i => i.size === size)?.['#text'];
          if (hit) return hit;
        }
        return images.at(-1)?.['#text'] || '';
      };
      const enriched = pickImage2(ti.image || []) || pickImage2(ti.album?.image || []);
      if (enriched && !isPlaceholder(enriched)) image = enriched;
    }
  }

  return {
    name,
    artist,
    url,
    image,
    weekStart: weekStartLocal.toISOString(),
    weekEnd: weekEndLocal.toISOString(),
  };
}

export default function PersonalHighlightsCard() {
  const [photo, setPhoto]   = useState(null);
  const [song, setSong]     = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [watch, setWatch]   = useState(null);
  const [read, setRead]     = useState(null);
  const [loading, setLoading] = useState(true);

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    photo_url: '',
    song_name: '', song_artist: '', song_url: '', song_image: '',
    recipe_name: '', recipe_url: '',
    watch_title: '', watch_platform: '', watch_link: '', watch_image: '',
    read_title: '', read_author: '', read_link: '', read_image: '',
    read_percent: '',
  });

  const username = import.meta.env.VITE_LASTFM_USERNAME;
  const apiKey   = import.meta.env.VITE_LASTFM_API_KEY;

  useEffect(() => {
    (async () => {
      const [p, r, w, s, rd] = await Promise.all([
        getCurrentFeature('photo'),
        getCurrentFeature('recipe'),
        getCurrentFeature('watch'),
        getCurrentFeature('song'),
        getCurrentFeature('read'),
      ]);
      if (p?.payload) setPhoto(p.payload);
      if (r?.payload) setRecipe(r.payload);
      if (w?.payload) setWatch(w.payload);
      if (rd?.payload) setRead(rd.payload);

      const weeklyTop = await fetchTopFromRecentSinceSunday({ username, apiKey });
      if (weeklyTop) {
        const enriched = { ...weeklyTop, timestamp: Date.now() };
        setSong(enriched);
        await upsertCurrentFeature('song', enriched);
      } else if (s?.payload) {
        setSong(s.payload);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modalOpen && !photoViewerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e) => e.key === 'Escape' && (setModalOpen(false), setPhotoViewerOpen(false));
    window.addEventListener('keydown', onEsc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onEsc); };
  }, [modalOpen, photoViewerOpen]);

  const openEditAll = () => {
    setForm({
      photo_url: photo?.url || '',
      song_name: song?.name || '', song_artist: song?.artist || '',
      song_url: song?.url || '', song_image: song?.image || '',
      recipe_name: recipe?.name || '', recipe_url: recipe?.url || '',
      watch_title: watch?.title || '', watch_platform: watch?.platform || '',
      watch_link: watch?.link || '', watch_image: watch?.image || '',
      read_title: read?.title || '', read_author: read?.author || '',
      read_link: read?.link || '', read_image: read?.image || '',
      read_percent: (read?.percent ?? '') === '' ? '' : String(read.percent),
    });
    setModalOpen(true);
  };

  const clampPercent = (v) => {
    if (v === '' || v == null) return '';
    const n = Number(v);
    if (Number.isNaN(n)) return '';
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const saveAll = async (e) => {
    e?.preventDefault?.();
    const ops = [];

    const photoPayload = form.photo_url ? { url: form.photo_url.trim() } : null;
    if (JSON.stringify(photoPayload) !== JSON.stringify(photo)) {
      ops.push(upsertCurrentFeature('photo', photoPayload));
      setPhoto(photoPayload);
    }

    const manualWeekStart = startOfWeekSunday(new Date()).toISOString();
    const manualWeekEnd = endOfWeekSunday(new Date()).toISOString();
    const songPayload = (form.song_name || form.song_artist || form.song_url || form.song_image)
      ? {
          name: form.song_name.trim(),
          artist: form.song_artist.trim(),
          url: form.song_url.trim(),
          image: form.song_image.trim(),
          timestamp: Date.now(),
          weekStart: manualWeekStart,
          weekEnd: manualWeekEnd,
        }
      : null;
    if (JSON.stringify(songPayload) !== JSON.stringify(song)) {
      ops.push(upsertCurrentFeature('song', songPayload));
      setSong(songPayload);
    }

    const recipePayload = (form.recipe_name || form.recipe_url)
      ? { name: form.recipe_name.trim(), url: form.recipe_url.trim() }
      : null;
    if (JSON.stringify(recipePayload) !== JSON.stringify(recipe)) {
      ops.push(upsertCurrentFeature('recipe', recipePayload));
      setRecipe(recipePayload);
    }

    const watchPayload = (form.watch_title || form.watch_platform || form.watch_link || form.watch_image)
      ? { title: form.watch_title.trim(), platform: form.watch_platform.trim(), link: form.watch_link.trim(), image: form.watch_image.trim() }
      : null;
    if (JSON.stringify(watchPayload) !== JSON.stringify(watch)) {
      ops.push(upsertCurrentFeature('watch', watchPayload));
      setWatch(watchPayload);
    }

    const percent = clampPercent(form.read_percent);
    const readPayload = (form.read_title || form.read_author || form.read_link || form.read_image || percent !== '')
      ? { title: form.read_title.trim(), author: form.read_author.trim(), link: form.read_link.trim(), image: form.read_image.trim(), percent: percent === '' ? null : percent }
      : null;
    if (JSON.stringify(readPayload) !== JSON.stringify(read)) {
      ops.push(upsertCurrentFeature('read', readPayload));
      setRead(readPayload);
    }

    await Promise.all(ops);
    setModalOpen(false);
  };

  /** Passive tile — now supports a "hero" variant */
  const Tile = ({
    icon,
    image,
    title,
    subtitle,
    linkHref,
    linkText = 'Open ↗',
    onImageClick,
    footer,
    hero = false,          // NEW: render as large hero photo tile
  }) => {
    if (hero) {
      // UPDATED: show full image (no crop) and cap size
      return (
        <div
          style={{
            display: 'grid',
            gap: 10,
            color: 'inherit',
            maxWidth: 'min(520px, 100%)',
            justifySelf: 'start',
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',       // keep aspect ratio
                maxHeight: 320,       // avoid huge hero
                objectFit: 'contain', // show entire image
                borderRadius: 12,
                background: 'rgba(255,255,255,.04)', // subtle letterbox
                cursor: onImageClick ? 'zoom-in' : 'default',
              }}
              onClick={onImageClick || undefined}
            />
          ) : (
            <div
              style={{
                width: 'min(520px, 100%)',
                height: 220,
                borderRadius: 12,
                border: '1px dashed currentColor',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                opacity: .6
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800 }}>{title}</div>
            {subtitle && <div className="muted" style={{ lineHeight: 1.2 }}>{subtitle}</div>}
            {linkHref ? (
              <a href={linkHref} target="_blank" rel="noreferrer">{linkText}</a>
            ) : (
              <span className="muted">No item set</span>
            )}
            {footer}
          </div>
        </div>
      );
    }

    // Default compact row tile
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'inherit' }}>
        {image ? (
          <img
            src={image}
            alt=""
            style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', cursor: onImageClick ? 'zoom-in' : 'default' }}
            onClick={onImageClick || undefined}
          />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: 8, border: '1px dashed currentColor',
            display: 'grid', placeItems: 'center', fontSize: 18, opacity: .6
          }}>{icon}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>
          {subtitle && <div className="muted" style={{ lineHeight: 1.2 }}>{subtitle}</div>}
          {linkHref ? (
            <a href={linkHref} target="_blank" rel="noreferrer">{linkText}</a>
          ) : (
            <span className="muted">No item set</span>
          )}
          {footer}
        </div>
      </div>
    );
  };

  const weekLabel = weekLabelFromRange(song?.weekStart, song?.weekEnd);

  /** ===== Photo lightbox portal ===== */
  const photoLightbox = useMemo(() => {
    if (!photoViewerOpen || !photo?.url) return null;
    return createPortal(
      <div
        className="modal-backdrop"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
        onMouseDown={() => setPhotoViewerOpen(false)}
      >
        <div
          style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            aria-label="Close"
            onClick={() => setPhotoViewerOpen(false)}
            style={{
              position: 'absolute', top: -8, right: -8, width: 36, height: 36,
              borderRadius: '999px', border: 'none', cursor: 'pointer',
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,.4)', fontSize: 20, lineHeight: '36px'
            }}
          >
            ×
          </button>
          <img
            src={photo.url}
            alt="Photo of the Week"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, display: 'block', objectFit: 'contain' }}
          />
        </div>
      </div>,
      document.body
    );
  }, [photoViewerOpen, photo?.url]);

  /** ===== Edit modal portal ===== */
  const modalPortal = useMemo(() => {
    if (!modalOpen) return null;
    return createPortal(
      <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
        <div
          className="modal"
          style={{ maxWidth: 820, maxHeight: '90vh', overflow: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Weekly Favorites Editor"
        >
          {/* IMPORTANT: disable native HTML5 validation */}
          <form noValidate onSubmit={saveAll}>
            <h3>Weekly Favorites – Edit</h3>

            <fieldset className="fld" style={{ margin: '22px 0', paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.08)' }}>
              <legend>Photo of the Week</legend>

              <label>Image URL
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                  placeholder="https://… (optional if you upload below)"
                  inputMode="url"
                />
              </label>

              <label style={{ marginTop: 10 }}>
                Or upload from computer
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    try {
                      const fd = new FormData();
                      fd.append('photo', file);
                      const res = await fetch('/api/features/photo', { method: 'POST', body: fd });
                      const json = await res.json();
                      if (res.ok && json.url) {
                        setForm(f => ({ ...f, photo_url: json.url }));
                        setPhoto({ url: json.url });
                        await upsertCurrentFeature('photo', { url: json.url });
                      } else {
                        alert(json?.error || 'Upload failed');
                      }
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                />
              </label>
              {uploadingPhoto && <div className="muted" style={{ marginTop: 6 }}>Uploading…</div>}
            </fieldset>

            <fieldset className="fld" style={{ margin: '22px 0', paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.08)' }}>
              <legend>Song of the Week</legend>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>Title
                  <input type="text" value={form.song_name}
                    onChange={e => setForm(f => ({ ...f, song_name: e.target.value }))} />
                </label>
                <label>Artist
                  <input type="text" value={form.song_artist}
                    onChange={e => setForm(f => ({ ...f, song_artist: e.target.value }))} />
                </label>
                <label>Link
                  <input type="url" value={form.song_url} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, song_url: e.target.value }))} inputMode="url" />
                </label>
                <label>Cover Image URL
                  <input type="url" value={form.song_image} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, song_image: e.target.value }))} inputMode="url" />
                </label>
              </div>
            </fieldset>

            <fieldset className="fld" style={{ margin: '22px 0', paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.08)' }}>
              <legend>Recipe of the Week</legend>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>Name
                  <input type="text" value={form.recipe_name}
                    onChange={e => setForm(f => ({ ...f, recipe_name: e.target.value }))} />
                </label>
                <label>Link
                  <input type="url" value={form.recipe_url} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, recipe_url: e.target.value }))} inputMode="url" />
                </label>
              </div>
            </fieldset>

            <fieldset className="fld" style={{ margin: '22px 0', paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.08)' }}>
              <legend>To Watch</legend>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>Title
                  <input type="text" value={form.watch_title}
                    onChange={e => setForm(f => ({ ...f, watch_title: e.target.value }))} />
                </label>
                <label>Platform
                  <input type="text" value={form.watch_platform} placeholder="Netflix, Prime, etc."
                    onChange={e => setForm(f => ({ ...f, watch_platform: e.target.value }))} />
                </label>
                <label>Link
                  <input type="url" value={form.watch_link} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, watch_link: e.target.value }))} inputMode="url" />
                </label>
                <label>Image URL
                  <input type="url" value={form.watch_image} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, watch_image: e.target.value }))} inputMode="url" />
                </label>
              </div>
            </fieldset>

            <fieldset className="fld" style={{ margin: '22px 0' }}>
              <legend>To Read</legend>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label>Title
                  <input type="text" value={form.read_title}
                    onChange={e => setForm(f => ({ ...f, read_title: e.target.value }))} />
                </label>
                <label>Author
                  <input type="text" value={form.read_author}
                    onChange={e => setForm(f => ({ ...f, read_author: e.target.value }))} />
                </label>
                <label>Link
                  <input type="url" value={form.read_link} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, read_link: e.target.value }))} inputMode="url" />
                </label>
                <label>Image URL
                  <input type="url" value={form.read_image} placeholder="https://…"
                    onChange={e => setForm(f => ({ ...f, read_image: e.target.value }))} inputMode="url" />
                </label>
                <label>Progress (%) 0–100
                  <input type="number" min="0" max="100" step="1" value={form.read_percent}
                    onChange={e => setForm(f => ({ ...f, read_percent: e.target.value }))} />
                </label>
              </div>
            </fieldset>

            {/* Buttons with clear contrast and spacing */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,.15)', background: '#fff', color: '#111', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }, [modalOpen, form, uploadingPhoto]);

  return (
    <div className="card" style={{ color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <h3>Weekly Favorites — {weekLabelFromRange(song?.weekStart, song?.weekEnd)}</h3>
        <button onClick={openEditAll}>Edit</button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && (
  <div className="wf-grid">
    {/* LEFT: photo */}
    <div className="wf-photo">
      <Tile
        hero
        icon="Photo"
        image={photo?.url}
        title="Photo of the Week"
        subtitle=""
        linkHref={photo?.url}
        linkText="Open image ↗"
        onImageClick={() => setPhotoViewerOpen(true)}
      />
    </div>

    {/* RIGHT: all other tiles live together in a vertically-centered column */}
    <div className="wf-tiles">
      <Tile
        icon="♪"
        image={song?.image}
        title={song?.name || 'Song of the Week'}
        subtitle={song?.artist || (song ? '—' : '')}
        linkHref={song?.url}
        linkText="Listen ↗"
      />

      <Tile
        icon="🍳"
        image={null}
        title={recipe?.name || 'Recipe of the Week'}
        subtitle=""
        linkHref={recipe?.url}
        linkText="View recipe ↗"
      />

      <Tile
        icon="🎬"
        image={watch?.image}
        title={watch?.title || 'To Watch'}
        subtitle={watch?.platform || (watch ? '—' : '')}
        linkHref={watch?.link}
        linkText="Open ↗"
      />

      <Tile
        icon="📖"
        image={read?.image}
        title={read?.title || 'To Read'}
        subtitle={[read?.author, (typeof read?.percent === 'number' ? `${read.percent}%` : null)]
          .filter(Boolean)
          .join(' — ')}
        linkHref={read?.link}
        linkText="Open ↗"
        footer={
          typeof read?.percent === 'number' ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 999 }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, read?.percent ?? 0))}%`,
                    height: 6,
                    borderRadius: 999,
                    background: 'currentColor',
                    opacity: .6,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
            </div>
          ) : null
        }
      />
    </div>
  </div>
)}



      {modalOpen && modalPortal}
      {photoViewerOpen && photoLightbox}
    </div>
  );
}
