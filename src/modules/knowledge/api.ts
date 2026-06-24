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
  workspaceId: string;
  name: string;
  type: string;
  url: string | null;
  status: KnowledgeSource['status'] | null;
  entryCount: number | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

type RawEntry = {
  id: string;
  sourceId: string;
  sourceName?: string;
  sourceType?: string;
  cweId: string | null;
  title: string;
  content: string | null;
  severity: string | null;
  remediation: string | null;
  tags: string[] | null;
  muted: boolean | null;
  usedByAiCount: number | null;
  createdAt: string;
  updatedAt: string | null;
};

type RawBackfillJob = {
  id: string;
  sourceId: string;
  workspaceId: string | null;
  sourceType: string;
  status: string;
  rangeStart: string;
  rangeEnd: string;
  cursorStart: string | null;
  windowDays: number | null;
  importedCount: number | null;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
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
    workspaceId: source.workspaceId,
    name: source.name,
    type: source.type,
    url: source.url,
    status: source.status ?? 'disconnected',
    entryCount: source.entryCount ?? 0,
    lastSyncedAt: source.lastSyncedAt,
    createdAt: source.createdAt,
  };
}

function mapEntry(entry: RawEntry): KnowledgeEntryRow {
  return {
    id: entry.id,
    sourceId: entry.sourceId,
    sourceName: entry.sourceName,
    sourceType: entry.sourceType,
    cweId: entry.cweId,
    title: entry.title,
    content: entry.content,
    severity: entry.severity,
    remediation: entry.remediation,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    muted: entry.muted ?? false,
    usedByAiCount: entry.usedByAiCount ?? 0,
    createdAt: entry.createdAt,
  };
}

function mapBackfillJob(job: RawBackfillJob): KnowledgeBackfillJob {
  return {
    id: job.id,
    sourceId: job.sourceId,
    workspaceId: job.workspaceId ?? undefined,
    sourceType: job.sourceType,
    status: job.status as KnowledgeBackfillJob['status'],
    rangeStart: job.rangeStart,
    rangeEnd: job.rangeEnd,
    cursorStart: job.cursorStart ?? undefined,
    windowDays: job.windowDays ?? undefined,
    importedCount: job.importedCount ?? 0,
    lastError: job.lastError ?? undefined,
    startedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
    createdAt: job.createdAt ?? new Date().toISOString(),
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
    const sources = Array.isArray(response.data) ? response.data.map(mapSource) : [];
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
    if (params?.perPage) queryParams.perPage = String(params.perPage);

    const qs = new URLSearchParams(queryParams).toString();
    const url = ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<RawEntriesPage>>(url);
    const pagination = response.meta?.pagination;
    return {
      data: Array.isArray(response.data?.data) ? response.data.data.map(mapEntry) : [],
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
    return result ? mapEntry(result) : null;
  },

  async updateEntry(workspaceId: string, id: string, data: UpdateKnowledgeEntryInput) {
    const { data: result } = await _api.Patch<ApiResponse<RawEntry>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id), data);
    return result ? mapEntry(result) : null;
  },

  async deleteEntry(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id));
  },

  async muteEntry(workspaceId: string, id: string) {
    const { data: result } = await _api.Patch<ApiResponse<RawEntry>>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, id), { muted: true });
    return result ? mapEntry(result) : null;
  },

  async createSource(workspaceId: string, data: CreateKnowledgeSourceInput) {
    const { data: result } = await _api.Post<ApiResponse<RawSource>>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId), data);
    return result ? mapSource(result) : null;
  },

  async updateSource(workspaceId: string, id: string, data: UpdateKnowledgeSourceInput) {
    const { data: result } = await _api.Patch<ApiResponse<RawSource>>(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, id), data);
    return result ? mapSource(result) : null;
  },

  async deleteSource(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, id));
  },

  async listBackfillJobs(workspaceId: string, id: string) {
    const { data } = await _api.Get<ApiResponse<RawBackfillJob[]>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return Array.isArray(data) ? data.map(mapBackfillJob) : [];
  },

  async startBackfill(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<RawBackfillJob>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id));
    return data ? mapBackfillJob(data) : null;
  },

  async resumeBackfill(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<RawBackfillJob>>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, id), { resume: true });
    return data ? mapBackfillJob(data) : null;
  },
};
