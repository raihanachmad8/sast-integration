import { apiFetch, apiPut, apiPost, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

export interface AiModel {
  id: string;
  workspace_id?: string;
  name: string;
  provider: string;
  base_url: string;
  api_key_encrypted?: string | null;
  role: string;
  priority: number;
  prompt_preset: string;
  custom_system_prompt?: string | null;
  status?: string | null;
  last_tested_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function listAiModels(workspaceId: string): Promise<AiModel[]> {
  return apiFetch<AiModel[]>(ENDPOINTS.AI_MODELS.LIST(workspaceId));
}

export async function getAiModel(workspaceId: string, id: string): Promise<AiModel> {
  return apiFetch<AiModel>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id));
}

export async function createAiModel(workspaceId: string, data: {
  name: string;
  provider: string;
  base_url: string;
  api_key_encrypted?: string | null;
  role?: string;
  priority?: number;
  prompt_preset?: string;
  custom_system_prompt?: string | null;
}): Promise<AiModel> {
  return apiPost<AiModel>(ENDPOINTS.AI_MODELS.LIST(workspaceId), data);
}

export async function updateAiModel(workspaceId: string, id: string, data: Partial<AiModel>): Promise<AiModel> {
  return apiPut<AiModel>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id), data);
}

export async function deleteAiModel(workspaceId: string, id: string): Promise<void> {
  return apiDelete(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id));
}

/**
 * Fetch available models from an OpenAI-compatible endpoint.
 * Tries /v1/models first, then falls back to /models.
 */
export async function fetchModelsFromEndpoint(baseUrl: string, apiKey?: string | null): Promise<string[]> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  for (const path of ['/v1/models', '/models']) {
    try {
      const res = await fetch(`${cleanUrl}${path}`, { headers, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json();
      const models: string[] = (json.data ?? json.models ?? [])
        .map((m: { id?: string; name?: string }) => m.id ?? m.name)
        .filter(Boolean);
      if (models.length > 0) return models;
    } catch {
      continue;
    }
  }
  return [];
}
