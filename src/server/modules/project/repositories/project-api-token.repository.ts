import crypto from 'crypto';

import { eq, and, isNull, or, gt, count } from 'drizzle-orm';

import { PERMISSION } from '@/commons/constants/permissions';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildPaginationMeta, buildSearch, buildSort } from '@/server/lib/query';
import { projectApiTokens, type ProjectApiToken, type NewProjectApiToken } from '@drizzle/schema/projects';
const TOKEN_PREFIX = 'sast_p_';
const TOKEN_RANDOM_BYTES = 32;

function generateRawToken(): string {
  const random = crypto.randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
  return `${TOKEN_PREFIX}${random}`;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export const projectApiTokenRepository = {
  /**
   * Generate a new project API token.
   * Returns the created record + the raw token (ONLY shown once to caller).
   */
  async create(data: {
    projectId: string;
    createdBy: string;
    name: string;
    permissions?: string[];
    expiresAt?: Date | null;
  }, tx?: Tx): Promise<{ token: ProjectApiToken; rawToken: string }> {
    logger.project.info('create API token', { projectId: data.projectId, name: data.name });
    const executor = tx ?? db;
    const rawToken = generateRawToken();
    const tokenSha256Val = sha256(rawToken);
    const prefix = rawToken.slice(0, 12) + '...';

    const [created] = await executor
      .insert(projectApiTokens)
      .values({
        projectId: data.projectId,
        createdBy: data.createdBy,
        name: data.name.trim(),
        tokenSha256: tokenSha256Val,
        tokenPrefix: prefix,
        permissions: data.permissions ?? [PERMISSION.SCAN_UPLOAD],
        expiresAt: data.expiresAt ?? undefined,
      } as NewProjectApiToken)
      .returning();

    logger.project.info('create API token completed', { projectId: data.projectId, tokenId: created.id });
    return { token: created, rawToken };
  },

  /** Find active token by exact SHA-256 hash (fast O(1) lookup) */
  async findActiveBySha256(rawToken: string): Promise<ProjectApiToken | null> {
    logger.project.info('findActiveBySha256');
    const tokenSha256Val = sha256(rawToken);
    const now = new Date();
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, now))
        )
      )
      .limit(1);
    if (!token) {
      logger.project.warn('findActiveBySha256: no active token found');
    }
    return token ?? null;
  },

  /** Find valid token for a project using SHA-256 fast lookup */
  async findValidForProject(projectId: string, rawToken: string): Promise<ProjectApiToken | null> {
    logger.project.info('findValidForProject', { projectId });
    const tokenSha256Val = sha256(rawToken);
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.projectId, projectId),
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, new Date()))
        )
      )
      .limit(1);
    if (!token) {
      logger.project.warn('findValidForProject: no valid token found', { projectId });
    }
    return token ?? null;
  },

  /** List active (non-revoked) tokens for a project */
  async listByProject(projectId: string) {
    logger.project.info('listByProject', { projectId });
    const rows = await db
      .select()
      .from(projectApiTokens)
      .where(and(eq(projectApiTokens.projectId, projectId), isNull(projectApiTokens.revokedAt)))
      .orderBy(projectApiTokens.createdAt);
    logger.project.info('listByProject completed', { projectId, count: rows.length });
    return rows;
  },

  /**
   * List active tokens for a project with DB-level pagination.
   *
   * @param projectId - Project UUID
   * @param params - Pagination params (page, perPage)
   * @returns Paginated token list with total, page, perPage, lastPage
   */
  async listByProjectPaginated(projectId: string, params?: { page?: number; perPage?: number; search?: string; sort?: string; order?: string }) {
    logger.project.info('listByProjectPaginated', { projectId, search: params?.search });
    const conditions = [
      eq(projectApiTokens.projectId, projectId),
      isNull(projectApiTokens.revokedAt),
      ...buildSearch(params?.search, projectApiTokens.name),
    ];

    // Count total
    const [{ total }] = await db
      .select({ total: count() })
      .from(projectApiTokens)
      .where(and(...conditions));

    // Sort
    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: projectApiTokens.name, createdAt: projectApiTokens.createdAt, lastUsedAt: projectApiTokens.lastUsedAt },
      projectApiTokens.createdAt,
    );

    // Paginate
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;

    const rows = await db
      .select()
      .from(projectApiTokens)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.project.info('listByProjectPaginated completed', { projectId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /** Revoke a token (soft) */
  async revoke(tokenId: string, revokedBy: string) {
    logger.project.info('revoke API token', { tokenId, revokedBy });
    const [updated] = await db
      .update(projectApiTokens)
      .set({
        revokedAt: new Date(),
        revokedBy,
      })
      .where(eq(projectApiTokens.id, tokenId))
      .returning();
    if (!updated) {
      logger.project.warn('revoke: token not found', { tokenId });
    }
    return updated ?? null;
  },

  /** Touch lastUsedAt (fire and forget, best effort) */
  async touchLastUsed(tokenId: string) {
    logger.project.debug('touchLastUsed', { tokenId });
    await db
      .update(projectApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(projectApiTokens.id, tokenId));
  },

  /** Find by ID (for ownership checks before revoke etc.) */
  async findById(id: string) {
    logger.project.info('findById', { id });
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(eq(projectApiTokens.id, id))
      .limit(1);
    if (!token) {
      logger.project.warn('findById: token not found', { id });
    }
    return token ?? null;
  },

  /**
   * Fast lookup for any valid project token using SHA-256 (used by generic authenticate()).
   * O(1) database lookup instead of O(n) sequential bcrypt comparisons.
   */
  async findAnyValidProjectToken(rawToken: string): Promise<ProjectApiToken | null> {
    if (!rawToken.startsWith('sast_p_')) {
      logger.project.debug('findAnyValidProjectToken: invalid token prefix');
      return null;
    }
    logger.project.info('findAnyValidProjectToken');
    const tokenSha256Val = sha256(rawToken);
    const now = new Date();
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, now))
        )
      )
      .limit(1);
    if (!token) {
      logger.project.warn('findAnyValidProjectToken: no valid token found');
    }
    return token ?? null;
  },
};
