/**
 * Repository API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

import { apiFetch } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { MOCK_REPOSITORIES } from '@/lib/mockData/repositories';
import type { Repository } from '@/commons/types';

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listRepositories(workspaceId: string): Promise<Repository[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_REPOSITORIES;
  }
  return apiFetch<Repository[]>(ENDPOINTS.REPOSITORIES.LIST_WORKSPACE(workspaceId));
}

export async function getRepository(_workspaceId: string, repositoryId: string): Promise<Repository | null> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_REPOSITORIES.find((r) => r.id === repositoryId) ?? null;
  }
  return apiFetch<Repository>(ENDPOINTS.REPOSITORIES.DETAIL_SIMPLE(repositoryId));
}
