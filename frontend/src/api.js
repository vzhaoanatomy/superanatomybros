// Thin fetch wrapper for the Classroom Code backend — the only network calls
// in the app (everything else persists to localStorage).
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function toWorldPayload(world) {
  return {
    name: world.name,
    subtitle: world.subtitle ?? '',
    enemyType: world.enemyType,
    palette: world.palette,
    defaultDurationMinutes: world.defaultDurationMinutes,
    vocab: world.vocab,
  };
}

export function publishWorld(world) {
  return request('/api/worlds', { method: 'POST', body: JSON.stringify(toWorldPayload(world)) });
}

export function updateWorld(code, world) {
  return request(`/api/worlds/${code}`, { method: 'PUT', body: JSON.stringify(toWorldPayload(world)) });
}

export function fetchWorld(code) {
  return request(`/api/worlds/${code}`);
}

export function submitScore(code, nickname, score, missedTermIds = []) {
  return request(`/api/scores/${code}`, { method: 'POST', body: JSON.stringify({ nickname, score, missedTermIds }) });
}

export function fetchLeaderboard(code) {
  return request(`/api/scores/${code}`);
}

export function fetchMissedTerms(code) {
  return request(`/api/worlds/${code}/missed-terms`);
}
