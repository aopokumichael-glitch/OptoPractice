// Small fetch wrapper for talking to the backend.
// In dev, Vite proxies "/api" -> http://localhost:4000 (see vite.config.js),
// so this works locally without any env vars. In production, set VITE_API_URL
// to your deployed backend's origin (e.g. https://api.optopractice.com).
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include', // send the httpOnly auth cookie
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. 204) — that's fine
  }

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
