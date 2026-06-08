import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { KnowledgeSource, KnowledgeEntryRow, KnowledgeBackfillJob } from '@/commons/types/knowledge';
import type { CreateKnowledgeEntryInput, CreateKnowledgeSourceInput, UpdateKnowledgeEntryInput, UpdateKnowledgeSourceInput } from '@/commons/schemas/knowledge-base.schema';

const _api = Api({ baseUrl: clientEnv.apiUrl });

type RawSource = {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  url: string | null;
  status: KnowledgeSource['status'] | null;
  entry_count: number | null;
  last_synced_at: string | null;
  created_at: string;
};

type RawEntry = {
  id: string;
  source_id: string;
  source_name?: string;
  source_type?: string;
  cwe_id: string | null;
  title: string;
  content: string | null;
  severity: string | null;
  remediation: string | null;
  tags: string[] | null;
  muted: boolean | null;
  used_by_ai_count: number | null;
  created_at: string;
};

function mapSource(source: RawSource): KnowledgeSource {
  return {
    id: source.id,
    workspaceId: source.workspace_id,
    name: source.name,
    type: source.type,
    url: source.url,
    status: source.status ?? 'disconnected',
    entryCount: source.entry_count ?? 0,
    lastSyncedAt: source.last_synced_at,
    createdAt: source.created_at,
  };
}

function mapEntry(entry: RawEntry): KnowledgeEntryRow {
  return {
    id: entry.id,
    sourceId: entry.source_id,
    sourceName: entry.source_name,
    sourceType: entry.source_type,
    cweId: entry.cwe_id,
    title: entry.title,
    content: entry.content,
    severity: entry.severity,
    remediation: entry.remediation,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    muted: entry.muted ?? false,
    usedByAiCount: entry.used_by_ai_count ?? 0,
    createdAt: entry.created_at,
  };
}



export const knowledgeApi = {
  /**
   * Lists knowledge sources for a workspace.
   *
   * @throws {Error} When the API request fails.
   */
  async listSources(workspaceId: string, _params: ListParams): Promise<PaginatedResponse<KnowledgeSource>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<KnowledgeSource>>>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId));
    return data;
  },

  /**
   * Lists knowledge entries for a workspace.
   *
   * @throws {Error} When the API request fails.
   */
  async listAllEntries(workspaceId: string, _params: ListParams): Promise<PaginatedResponse<KnowledgeEntryRow>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<KnowledgeEntryRow>>>(ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId));
    return data;
  },

  async listEntries(workspaceId: string, sourceId: string) {
    const entries = await this.listAllEntries(workspaceId, { page: 1, per_page: 1000 });
    return entries.data.filter((entry) => entry.sourceId === sourceId);
  },

  async createEntry(workspaceId: string, data: CreateKnowledgeEntryInput) {
    const { data: result } = await _api.Post<ApiResponse<RawEntry>>(ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId), data);
    return mapEntry(result);
  },

  async updateEntry(workspaceId: string, id: string, data: UpdateKnowledgeEntryInput) {
    const { data: result } = await _api.Patch<ApiResponse<RawEntry>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id), data);
    return mapEntry(result);
  },

  async deleteEntry(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id));
  },

  async createSource(workspaceId: string, data: CreateKnowledgeSourceInput) {
    const { data: result } = await _api.Post<ApiResponse<RawSource>>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId), data);
    return mapSource(result);
  },

  async updateSource(workspaceId: string, id: string, data: UpdateKnowledgeSourceInput) {
    const { data: result } = await _api.Patch<ApiResponse<RawSource>>(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, id), data);
    return mapSource(result);
  },

  async deleteSource(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, id));
  },

  async syncSource(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<{ sourceId: string; entriesCreated: number; entriesUpdated: number }>>(ENDPOINTS.KNOWLEDGE_SOURCES.SYNC(workspaceId, id));
    return data;
  },

  async listBackfillJobs(workspaceId: string, id: string) {
    const { data } = await _api.Get<ApiResponse<KnowledgeBackfillJob[]>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return data;
  },

  async startBackfill(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<KnowledgeBackfillJob>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return data;
  },
};
