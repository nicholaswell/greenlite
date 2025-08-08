export async function getGoals() {
    const res = await fetch('/api/goals');
    return res.json();
  }
  
  export async function createGoal(data) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export async function updateGoal(id, data) {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  
  export function deleteGoal(id) {
    return fetch(`/api/goals/${id}`, { method: 'DELETE' });
  }
  