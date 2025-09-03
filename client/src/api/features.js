const BASE = '/api/features'; // adjust if your server runs on another origin

export async function getCurrentFeature(kind) {
  const res = await fetch(`${BASE}/${kind}/current`);
  if (!res.ok) throw new Error('Failed to fetch feature');
  return res.json();
}

export async function upsertCurrentFeature(kind, payload) {
  const res = await fetch(`${BASE}/${kind}/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });
  if (!res.ok) throw new Error('Failed to save feature');
  return res.json();
}
