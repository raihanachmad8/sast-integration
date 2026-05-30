import { API_BASE } from '@/commons/constants';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`);
  return json.data;
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  currentWorkspaceId: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface SessionData {
  user: User;
  workspace: Workspace | null;
}

export interface SigninResponse {
  tokenType: string;
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  user: User;
  workspace: Workspace | null;
}

export interface ConfigData {
  workspaceMode: string;
}

export const authApi = {
  signin: (email: string, password: string) =>
    request<SigninResponse>('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (email: string, password: string, name: string) =>
    request<{ id: string; email: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  signout: (token: string) =>
    request<null>('/auth/signout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),

  refresh: () =>
    request<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  me: (token: string) =>
    request<SessionData>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),

  config: () =>
    request<ConfigData>('/config'),
};
