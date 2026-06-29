/**
 * Project API Tokens API client.
 *
 * Provides functions for managing API tokens for project integrations.
 * Tokens allow external systems (CI/CD) to authenticate with the platform.
 */

import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

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
  /** Permissions granted by the token */
  permissions: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Revocation timestamp (null if active) */
  revokedAt: string | null;
  /** Last usage timestamp */
  lastUsedAt: string | null;
  /** Expiration timestamp */
  expiresAt: string | null;
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

/**
 * API tokens client — CRUD operations for project-scoped API tokens.
 */
export const apiTokensApi = {
  /**
   * List all API tokens for a project.
   */
  async list(workspaceId: string, projectId: string, params?: Record<string, unknown>): Promise<PaginatedResponse<ApiToken>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ApiToken>>>(
      ENDPOINTS.PROJECTS.API_TOKENS(workspaceId, projectId),
      params,
    );
    return extractPaginated(response);
  },

  /**
   * Create a new API token for a project.
   */
  async create(
    workspaceId: string,
    projectId: string,
    body: { name: string; permissions?: string[]; expiresInDays?: number | null },
  ): Promise<CreateApiTokenResult> {
    const result = await _api.Post<ApiResponse<CreateApiTokenResult>>(
      ENDPOINTS.PROJECTS.API_TOKENS(workspaceId, projectId),
      body,
    );
    return result.data;
  },

  /**
   * Revoke an API token.
   */
  async revoke(workspaceId: string, projectId: string, tokenId: string): Promise<{ id: string }> {
    const result = await _api.Delete<ApiResponse<{ id: string }>>(
      ENDPOINTS.PROJECTS.API_TOKEN(workspaceId, projectId, tokenId),
    );
    return result.data;
  },
};
