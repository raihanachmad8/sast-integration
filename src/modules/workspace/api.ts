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

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  type: 'personal' | 'organization';
  description: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export const workspaceApi = {
  list: (token: string) =>
    request<WorkspaceItem[]>('/workspaces', { headers: { Authorization: `Bearer ${token}` } }),

  create: (token: string, data: { name: string; slug?: string; description?: string }) =>
    request<WorkspaceItem>('/workspaces', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }),

  switchWorkspace: (token: string, workspaceId: string) =>
    request<{ currentWorkspaceId: string }>('/users/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentWorkspaceId: workspaceId }) }),
};
