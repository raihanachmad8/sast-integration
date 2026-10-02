/**
 * Project API Tokens API module.
 *
 * Provides functions for managing API tokens for project integrations.
 * Tokens allow external systems (CI/CD) to authenticate with the platform.
 *
 * @example
 * ```ts
 * import { projectApiTokensApi } from '@/modules/project/api-tokens';
 *
 * // List tokens
 * const { tokens } = await projectApiTokensApi.list('ws-123', 'proj-456');
 *
 * // Create a token
 * const { token, rawValue } = await projectApiTokensApi.create('ws-123', 'proj-456', {
 *   name: 'CI Token',
 *   permissions: ['scan:read', 'scan:write'],
 *   expiresInDays: 90,
 * });
 * console.log(`Token created: ${rawValue}`); // Shown once only
 *
 * // Revoke a token
 * await projectApiTokensApi.revoke('ws-123', 'proj-456', token.id);
 * ```
 */

import { apiFetch, apiPost, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

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
  rawValue: string;
}

export const projectApiTokensApi = {
  /**
   * List all API tokens for a project.
   *
   * @param workspaceId - The workspace the project belongs to
   * @param projectId - The project to list tokens for
   * @returns Object containing the array of tokens
   * @throws {ApiRequestError} On server error
   *
   * @example
   * ```ts
   * const { tokens } = await projectApiTokensApi.list('ws-123', 'proj-456');
   * tokens.forEach(t => console.log(`${t.name}: ${t.prefix}...`));
   * ```
   */
  list: (workspaceId: string, projectId: string) =>
    apiFetch<{ tokens: ApiToken[] }>(
      ENDPOINTS.PROJECTS.API_TOKENS(workspaceId, projectId),
    ),

  /**
   * Create a new API token for a project.
   *
   * @param workspaceId - The workspace the project belongs to
   * @param projectId - The project to create the token for
   * @param data - Token configuration
   * @returns The newly created token and its raw value (shown once)
   * @throws {ApiRequestError} On validation or server error
   *
   * @example
   * ```ts
   * const { token, rawValue } = await projectApiTokensApi.create('ws-123', 'proj-456', {
   *   name: 'CI Pipeline',
   *   permissions: ['scan:read', 'scan:write'],
   *   expiresInDays: 90,
   * });
   * // IMPORTANT: Save rawValue - it won't be shown again!
   * ```
   */
  create: (
    workspaceId: string,
    projectId: string,
    data: { name: string; permissions?: string[]; expiresInDays?: number | null },
  ) =>
    apiPost<CreateApiTokenResult>(
      ENDPOINTS.PROJECTS.API_TOKENS(workspaceId, projectId),
      data,
    ),

  /**
   * Revoke an API token.
   *
   * @param workspaceId - The workspace the project belongs to
   * @param projectId - The project the token belongs to
   * @param tokenId - The token to revoke
   * @throws {ApiRequestError} On server error
   *
   * @example
   * ```ts
   * await projectApiTokensApi.revoke('ws-123', 'proj-456', 'tok-789');
   * console.log('Token revoked');
   * ```
   */
  revoke: (workspaceId: string, projectId: string, tokenId: string) =>
    apiDelete<{ id: string }>(
      ENDPOINTS.PROJECTS.API_TOKEN(workspaceId, projectId, tokenId),
    ),
};
