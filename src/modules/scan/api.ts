import type { ScanRow, Finding } from '@/commons/types/domain';
import type { ScanDetailData, TriggerScanPayload } from './types';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/** Supported scanner identifiers — mirrors server constants. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used to derive ScannerId type
const SUPPORTED_SCANNERS = ['semgrep', 'cppcheck', 'gitleaks', 'flawfinder', 'clang-tidy', 'gcc-fanalyzer'] as const;
type ScannerId = (typeof SUPPORTED_SCANNERS)[number];

/** Scanner availability map from the API */
export type ScannerAvailability = Record<ScannerId, boolean>;

/**
 * Scan API client — HTTP calls and mock fallbacks for the scan module.
 */
export const scanApi = {
  /**
   * Fetch all scan rows for the current workspace.
   */
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ScanRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScanRow>>>(ENDPOINTS.SCANS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  /**
   * Fetch scans for a specific repository.
   */
  async listRepository(workspaceId: string, projectId: string, repoId: string, params: ListParams): Promise<PaginatedResponse<ScanRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScanRow>>>(ENDPOINTS.SCANS.LIST_REPOSITORY(workspaceId, projectId, repoId), params);
    return extractPaginated(response);
  },

  /**
   * Fetch detailed scan information including timeline and AI stats.
   */
  async getDetail(workspaceId: string, scanId: string): Promise<ScanDetailData | null> {
    const { data } = await _api.Get<ApiResponse<ScanDetailData | null>>(ENDPOINTS.SCANS.DETAIL(workspaceId, scanId));
    return data;
  },

  /**
   * Fetch findings for a specific scan.
   * Uses the workspace findings API with scanId filter.
   */
  async getFindings(workspaceId: string, scanId: string): Promise<Finding[]> {
    const response = await _api.Get<ApiResponse<Finding[]>>(ENDPOINTS.FINDINGS.LIST(workspaceId), { scanId });
    return response.data ?? [];
  },

  /**
   * Trigger a new scan on a repository.
   */
  async trigger(workspaceId: string, _projectId: string, repoId: string, payload: TriggerScanPayload): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.SCANS.LIST(workspaceId), {
      repositoryId: repoId,
      branch: payload.branch,
      scanners: payload.scanners,
    });
  },

  /**
   * Check which scanners are available on the host system.
   */
  async getAvailability(workspaceId: string): Promise<ScannerAvailability> {
    const { data } = await _api.Get<ApiResponse<ScannerAvailability>>(ENDPOINTS.SCANNERS.AVAILABILITY(workspaceId));
    return data ?? {};
  },

  /**
   * Fetch branches for a repository from its SCM provider.
   */
  async listBranches(workspaceId: string, repoId: string): Promise<string[]> {
    const { data } = await _api.Get<ApiResponse<string[]>>(ENDPOINTS.REPOSITORIES.BRANCHES(workspaceId, repoId));
    return data ?? [];
  },
};
