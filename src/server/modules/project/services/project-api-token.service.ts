import { PERMISSION } from '@/commons/constants/permissions';
import type { CreateApiTokenInput } from '@/commons/schemas/api-token.schema';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { ProjectApiToken } from '@drizzle/schema/projects';

import { PROJECT, MS_PER_DAY } from '../constants';
import { projectApiTokenRepository } from '../repositories/project-api-token.repository';

/**
 * Project API token service.
 * Wraps repository methods with error handling, logging, and business logic.
 * Auth checks (project existence, workspace membership) remain in project.service.ts.
 */
export const projectApiTokenService = {
  /**
   * Create a new project-scoped API token.
   * Returns the created record + the raw token (shown only once).
   *
   * @param projectId - Project UUID
   * @param userId - User UUID of the creator
   * @param input - Token creation data (name, permissions, expiry)
   * @returns Created token record and the raw token string
   * @throws {AppError} 500 - Token creation failed
   */
  async create(
    projectId: string,
    input: CreateApiTokenInput,
    userId: string,
  ) {
    logger.project.info('apiToken.create', { projectId, name: input.name });
    const permissions = input.permissions ?? [PERMISSION.SCAN_UPLOAD];

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * MS_PER_DAY)
      : null;

    const { token, rawToken } = await projectApiTokenRepository.create({
      projectId,
      createdBy: userId,
      name: input.name,
      permissions,
      expiresAt: expiresAt ?? undefined,
    });

    const result = {
      token: {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        permissions: token.permissions,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
      rawToken,
    };

    logger.project.info('apiToken.create completed', { projectId, tokenId: token.id });
    return result;
  },

  /**
   * List active (non-revoked) tokens for a project with DB-level pagination.
   *
   * @param projectId - Project UUID
   * @param params - Pagination params (page, perPage)
   * @returns Paginated token list with total, page, perPage, lastPage
   */
  async list(projectId: string, params?: { page?: number; perPage?: number }) {
    logger.project.info('list', { projectId });

    const result = await projectApiTokenRepository.listByProjectPaginated(projectId, params);
    const data = result.data.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      permissions: t.permissions,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      revokedAt: t.revokedAt,
    }));

    logger.project.info('apiToken.list completed', { count: data.length, total: result.total });
    return { ...result, data };
  },

  /**
   * Revoke a token (soft delete).
   * Verifies the token belongs to the specified project before revoking.
   *
   * @param projectId - Project UUID (ownership check)
   * @param tokenId - Token UUID to revoke
   * @param userId - User UUID performing the revocation
   * @returns Updated (revoked) token record
   * @throws {AppError} 404 - Token not found or does not belong to the project
   */
  async revoke(projectId: string, tokenId: string, userId: string) {
    logger.project.info('apiToken.revoke', { projectId, tokenId });

    const token = await projectApiTokenRepository.findById(tokenId);
    if (!token || token.projectId !== projectId) {
      logger.project.warn('apiToken.revoke token not found or mismatch', { projectId, tokenId });
      throw new AppError(PROJECT.ERRORS.TOKEN_NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    const result = await projectApiTokenRepository.revoke(tokenId, userId);
    logger.project.info('apiToken.revoke completed', { tokenId });
    return result;
  },

  /**
   * Find a valid token by its raw value (SHA-256 lookup).
   * Used by authentication middleware.
   *
   * @param rawToken - The raw token string to validate
   * @returns The token record if valid, null otherwise
   */
  async findActiveBySha256(rawToken: string): Promise<ProjectApiToken | null> {
    return projectApiTokenRepository.findActiveBySha256(rawToken);
  },

  /**
   * Find a valid token for a specific project.
   * Used by project-scoped authentication.
   *
   * @param projectId - Project UUID
   * @param rawToken - The raw token string to validate
   * @returns The token record if valid for this project, null otherwise
   */
  async findValidForProject(projectId: string, rawToken: string): Promise<ProjectApiToken | null> {
    return projectApiTokenRepository.findValidForProject(projectId, rawToken);
  },

  /**
   * Fast lookup for any valid project token.
   * Used by generic authenticate() for O(1) SHA-256 lookup.
   *
   * @param rawToken - The raw token string to validate
   * @returns The token record if valid, null otherwise
   */
  async findAnyValidProjectToken(rawToken: string): Promise<ProjectApiToken | null> {
    if (!rawToken.startsWith('sast_p_')) return null;

    return projectApiTokenRepository.findAnyValidProjectToken(rawToken);
  },

  /**
   * Touch the lastUsedAt timestamp on a token (fire and forget).
   *
   * @param tokenId - Token UUID to update
   */
  async touchLastUsed(tokenId: string): Promise<void> {
    await projectApiTokenRepository.touchLastUsed(tokenId);
  },

  /**
   * Find a token by ID. Used for ownership checks before revoke etc.
   *
   * @param id - Token UUID
   * @returns The token record, or null if not found
   */
  async findById(id: string): Promise<ProjectApiToken | null> {
    return projectApiTokenRepository.findById(id);
  },
};
