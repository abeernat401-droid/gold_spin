import type { AccessRequest, Prize, WinRecord } from '../types/types';

export interface SessionUser {
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}
export interface AppState {
  user: SessionUser;
  prizes: Prize[];
  accessRequests: AccessRequest[];
  wins: WinRecord[];
  totalDistributed: number;
}

export async function api<T>(route: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${route}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body as T;
}

export function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}
