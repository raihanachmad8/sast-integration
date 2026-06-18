/**
 * Project API Tokens API module.
 *
 * Provides functions for managing API tokens for project integrations.
 * Tokens allow external systems (CI/CD) to authenticate with the platform.
 */

import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * API token for project integrations.
 */
export interface ApiToken {
  /** Unique identifier */
  id: string;
  /** Token name */
  name: string;
  /** Token prefix (first 8 chars) */
  prefix: string;
  /** Creation timestamp */
  createdAt: string;
  /** Revocation timestamp (null if active) */
  revokedAt: string | null;
  /** Last usage timestamp */
  lastUsedAt: string | null;
}

/**
 * Result of creating an API token.
 */
export interface CreateApiTokenResult {
  /** Created token metadata */
  token: ApiToken;
  /** Raw token value (shown once, save securely) */
  rawToken: string;
}

export const projectApiTokensApi = {
  /**
   * List all API tokens for a project.
   */
  async list(_workspaceId: string, projectId: string): Promise<{ data: ApiToken[] }> {
    const response = await _api.Get<ApiResponse<ApiToken[]>>(
      ENDPOINTS.PROJECTS.API_TOKENS(_workspaceId, projectId),
    );
    return { data: response.data ?? [] };
  },

  /**
   * Create a new API token for a project.
   */
  async create(
    _workspaceId: string,
    projectId: string,
    body: { name: string; permissions?: string[]; expiresInDays?: number | null },
  ): Promise<CreateApiTokenResult> {
    const result = await _api.Post<ApiResponse<CreateApiTokenResult>>(
      ENDPOINTS.PROJECTS.API_TOKENS(_workspaceId, projectId),
      body,
    );
    return result.data;
  },

  /**
   * Revoke an API token.
   */
  async revoke(_workspaceId: string, _projectId: string, tokenId: string): Promise<{ id: string }> {
    const result = await _api.Delete<ApiResponse<{ id: string }>>(
      ENDPOINTS.PROJECTS.API_TOKEN(_workspaceId, _projectId, tokenId),
    );
    return result.data;
  },
};
