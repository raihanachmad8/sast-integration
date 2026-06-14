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
  updated_at: string | null;
};

type RawBackfillJob = {
  id: string;
  source_id: string;
  workspace_id: string | null;
  source_type: string;
  status: string;
  range_start: string;
  range_end: string;
  cursor_start: string | null;
  window_days: number | null;
  imported_count: number | null;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  progress?: number;
};

type RawEntriesPage = {
  data: RawEntry[];
  total: number;
  page: number;
  perPage: number;
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

function mapBackfillJob(job: RawBackfillJob): KnowledgeBackfillJob {
  return {
    id: job.id,
    sourceId: job.source_id,
    workspaceId: job.workspace_id ?? undefined,
    sourceType: job.source_type,
    status: job.status as KnowledgeBackfillJob['status'],
    rangeStart: job.range_start,
    rangeEnd: job.range_end,
    cursorStart: job.cursor_start ?? undefined,
    windowDays: job.window_days ?? undefined,
    importedCount: job.imported_count ?? 0,
    lastError: job.last_error ?? undefined,
    startedAt: job.started_at ?? undefined,
    completedAt: job.completed_at ?? undefined,
    createdAt: job.created_at ?? new Date().toISOString(),
    progress: job.progress ?? -1,
  };
}

export interface KnowledgeEntriesParams {
  search?: string;
  source?: string;
  page?: number;
  perPage?: number;
}

export const knowledgeApi = {
  /**
   * Lists knowledge sources for a workspace.
   */
  async listSources(workspaceId: string, _params?: ListParams): Promise<PaginatedResponse<KnowledgeSource>> {
    const response = await _api.Get<ApiResponse<RawSource[]>>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId));
    const sources = response.data.map(mapSource);
    return {
      data: sources,
      meta: {
        page: 1,
        perPage: sources.length || _params?.perPage || 100,
        total: sources.length,
        lastPage: 1,
      },
    };
  },

  /**
   * Lists knowledge entries for a workspace with server-side search and filter.
   */
  async listAllEntries(workspaceId: string, params?: KnowledgeEntriesParams): Promise<PaginatedResponse<KnowledgeEntryRow>> {
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.source) queryParams.source = params.source;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    const qs = new URLSearchParams(queryParams).toString();
    const url = ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<RawEntriesPage>>(url);
    const pagination = response.meta?.pagination;
    return {
      data: response.data.data.map(mapEntry),
      meta: {
        page: pagination?.page ?? response.data.page,
        perPage: pagination?.perPage ?? response.data.perPage,
        total: pagination?.total ?? response.data.total,
        lastPage: pagination?.totalPages ?? Math.ceil(response.data.total / response.data.perPage),
      },
    };
  },

  async listEntries(workspaceId: string, sourceId: string) {
    const entries = await this.listAllEntries(workspaceId, { source: sourceId, perPage: 1000 });
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

  async muteEntry(workspaceId: string, id: string) {
    const { data: result } = await _api.Patch<ApiResponse<RawEntry>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id), { muted: true });
    return mapEntry(result);
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
    const { data } = await _api.Post<ApiResponse<{ sourceId: string; entriesCreated: number; entriesUpdated: number }>>(
      ENDPOINTS.KNOWLEDGE_SOURCES.SYNC(workspaceId, id),
      undefined,
      { timeout: 120_000 }, // NVD sync can take minutes
    );
    return data;
  },

  async listBackfillJobs(workspaceId: string, id: string) {
    const { data } = await _api.Get<ApiResponse<RawBackfillJob[]>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return Array.isArray(data) ? data.map(mapBackfillJob) : [];
  },

  async startBackfill(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<RawBackfillJob>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return mapBackfillJob(data);
  },

  async resumeBackfill(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<RawBackfillJob>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id), { resume: true });
    return mapBackfillJob(data);
  },
};
