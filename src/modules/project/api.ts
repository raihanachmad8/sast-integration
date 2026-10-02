/**
 * Projects API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

import { MOCK_PROJECTS } from '@/lib/mockData/projects';
import type { Project } from '@/commons/types';
import type { CreateProjectPayload, UpdateProjectPayload } from './types';

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listProjects(): Promise<Project[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_PROJECTS;
  }
  const res = await fetch('/api/v1/projects');
  const json = await res.json();
  return json.data;
}

export async function getProject(id: string): Promise<Project | null> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_PROJECTS.find((p) => p.id === id) ?? null;
  }
  const res = await fetch(`/api/v1/projects/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return {
      id: `proj-${Date.now()}`,
      name: payload.name,
      description: payload.description,
      lead: payload.lead,
      teams: [],
      members: [],
      repositories: [],
      automation: [],
    };
  }
  const res = await fetch('/api/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
  if (USE_MOCK_DATA) {
    await delay(300);
    const existing = MOCK_PROJECTS.find((p) => p.id === id);
    return { ...existing!, ...payload };
  }
  const res = await fetch(`/api/v1/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(250);
    return { success: true };
  }
  const res = await fetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
  return res.json();
}
