export async function getNotes() {
    const res = await fetch('/api/notes');
    return res.json();
  }
  
  export async function createNote(data) {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export function deleteNote(id) {
    return fetch(`/api/notes/${id}`, { method: 'DELETE' });
  }
  
  export async function updateNote(id, data) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  