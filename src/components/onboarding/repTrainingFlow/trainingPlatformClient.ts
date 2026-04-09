import { normalizeObjectIds } from './mongoIds';

export function getTrainingBaseUrl(): string {
  if (import.meta.env.VITE_API_TRAINING_URL) {
    return import.meta.env.VITE_API_TRAINING_URL as string;
  }
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
}

function jsonHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function trainingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getTrainingBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...jsonHeaders(), ...(init.headers || {}) }
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((raw as { message?: string }).message || `Request failed (${res.status})`);
  }
  return normalizeObjectIds(raw) as T;
}

export async function trainingUpload(path: string, formData: FormData): Promise<unknown> {
  const base = getTrainingBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { method: 'POST', headers, body: formData });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((raw as { message?: string; error?: string }).error || (raw as { message?: string }).message || 'Upload failed');
  }
  return normalizeObjectIds(raw);
}
