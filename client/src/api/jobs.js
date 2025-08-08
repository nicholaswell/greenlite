export async function getJobs() {
    const res = await fetch('/api/jobs');
    return res.json();
  }
  
  export async function createJob(data) {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export async function updateJob(id, data) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export function deleteJob(id) {
    return fetch(`/api/jobs/${id}`, { method: 'DELETE' });
  }
  