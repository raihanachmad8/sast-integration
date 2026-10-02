/**
 * Teams API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

import { MOCK_TEAMS, MOCK_TEAM_MEMBERS } from '@/lib/mockData/teams';
import type { Team, TeamMember } from '@/commons/types';
import type { CreateTeamPayload, UpdateTeamPayload } from './types';

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listTeams(): Promise<Team[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_TEAMS;
  }
  const res = await fetch('/api/v1/teams');
  const json = await res.json();
  return json.data;
}

export async function getTeam(id: string): Promise<Team | null> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_TEAMS.find((t) => t.id === id) ?? null;
  }
  const res = await fetch(`/api/v1/teams/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_TEAM_MEMBERS[teamId] ?? [];
  }
  const res = await fetch(`/api/v1/teams/${teamId}/members`);
  const json = await res.json();
  return json.data;
}

export async function createTeam(payload: CreateTeamPayload): Promise<Team> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return {
      id: `team-${Date.now()}`,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      memberCount: payload.memberIds.length,
      projects: [],
      createdAt: new Date().toISOString(),
    };
  }
  const res = await fetch('/api/v1/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateTeam(id: string, payload: UpdateTeamPayload): Promise<Team> {
  if (USE_MOCK_DATA) {
    await delay(300);
    const existing = MOCK_TEAMS.find((t) => t.id === id);
    return { ...existing!, ...payload };
  }
  const res = await fetch(`/api/v1/teams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteTeam(id: string): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(250);
    return { success: true };
  }
  const res = await fetch(`/api/v1/teams/${id}`, { method: 'DELETE' });
  return res.json();
}
