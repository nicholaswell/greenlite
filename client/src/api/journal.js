export async function getJournalEntries() {
    const res = await fetch('/api/journal');
    return res.json();
  }
  
  export async function createJournalEntry(data) {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export function deleteJournalEntry(id) {
    return fetch(`/api/journal/${id}`, { method: 'DELETE' });
  }
  
  export async function updateJournalEntry(id, data) {
    const res = await fetch(`/api/journal/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  