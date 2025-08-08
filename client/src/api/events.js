export async function getEvents() {
    const res = await fetch('/api/events');
    return res.json();
  }
  
  export async function createEvent(data) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export function deleteEvent(id) {
    return fetch(`/api/events/${id}`, { method: 'DELETE' });
  }
  
  export async function updateEvent(id, data) {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  