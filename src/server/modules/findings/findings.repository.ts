import { eq, and, sql, inArray, isNull, count } from 'drizzle-orm';

import type { FindingListQuery } from '@/commons/schemas/findings.schema';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildFilters, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { workspaces, workspaceMembers } from '@drizzle/schema';
import { findings, findingGroups, findingGroupScans } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';

interface BulkUpdatePayload {
  status?: string;
  assignedTo?: string | null;
}

export const findingsRepository = {
  /**
   * Get a user's role in a workspace.
   */
  async getMemberRole(workspaceId: string, userId: string, tx?: Tx) {
    logger.finding.info('getMemberRole', { workspaceId, userId });
    const exec = tx ?? db;
    const [member] = await exec
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
      .limit(1);
    return member?.role ?? null;
  },

  /**
   * List findings across a workspace with pagination and optional filters.
   * Deduplicates by groupId (same issue across multiple scans → 1 row).
   *
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters (validated by Zod)
   * @returns Paginated findings data with total count, page, and perPage
   */
  async listByWorkspace(workspaceId: string, params?: FindingListQuery, tx?: Tx) {
    const exec = tx ?? db;
    logger.finding.info('listByWorkspace', { workspaceId });
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const conditions = [
      eq(projects.workspaceId, workspaceId),
      isNull(projects.deletedAt),
    ];

    // Search (reusable)
    conditions.push(...buildSearch(params?.search, findings.description, findings.rule, findings.message));

    // Filters (reusable)
    conditions.push(...buildFilters(
      {
        scanId: params?.scanId,
        status: params?.status,
        severity: params?.severity,
        projectId: params?.projectId,
        repositoryId: params?.repositoryId,
      },
      {
        scanId: findings.scanId,
        status: findingGroups.status,
        severity: findings.severity,
        projectId: repositories.projectId,
        repositoryId: repositories.id,
      },
    ));

    if (params?.onlyNew !== undefined) {
      conditions.push(eq(findingGroupScans.isNew, params.onlyNew));
    }

    const where = and(...conditions);

    const sortExpr = buildSort(
      params?.sort,
      params?.order,
      { createdAt: findings.createdAt, severity: findings.severity, scanner: findings.scanner, filePath: findings.filePath, status: findings.status },
      findings.createdAt,
    );

    // Explicit select to flatten join results — avoids nested {findings: {...}} objects.
    // DISTINCT ON (findings.group_id) deduplicates: same issue across multiple scans → 1 row.
    // We take the latest finding (by created_at desc) per group.
    const selectShape = {
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      codeSnippet: findings.codeSnippet,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      status: findings.status,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      updatedAt: findings.updatedAt,
      projectId: repositories.projectId,
      repositoryName: repositories.name,
      groupStatus: findingGroups.status,
    };

    // Subquery: get the max id per group_id to deduplicate
    const latestPerGroup = exec
      .select({ maxId: sql<string>`max(${findings.id})` })
      .from(findings)
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
      .innerJoin(projects, eq(repositories.projectId, projects.id))
      .leftJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(where)
      .groupBy(findingGroups.id, findings.groupId)
      .as('latest_per_group');

    const baseQuery = exec
      .select(selectShape)
      .from(findings)
      .innerJoin(latestPerGroup, eq(findings.id, latestPerGroup.maxId))
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .leftJoin(findingGroupScans, eq(findingGroupScans.groupId, findingGroups.id))
      .orderBy(sortExpr);

    // Count distinct groups
    const [data, countResult] = await Promise.all([
      baseQuery.limit(perPage).offset(offset),
      exec
        .select({ total: count() })
        .from(findings)
        .innerJoin(scans, eq(findings.scanId, scans.id))
        .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
        .innerJoin(projects, eq(repositories.projectId, projects.id))
        .leftJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .where(where),
    ]);

    const total = Number(countResult[0]?.total ?? 0);
    logger.finding.info('listByWorkspace completed', { workspaceId, count: data.length, total });
    return {
      data,
      ...buildPaginationMeta(total, page, perPage),
    };
  },

  /**
   * Get a single finding by ID scoped to a workspace.
   * @param workspaceId - Workspace UUID for scoping
   * @param id - Finding UUID
   * @returns Finding record joined with group and project data, or null if not found
   */
  async getById(workspaceId: string, id: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.finding.info('getById', { id, workspaceId });
    const [result] = await exec
      .select()
      .from(findings)
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
      .innerJoin(projects, eq(repositories.projectId, projects.id))
      .leftJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(
        and(
          eq(findings.id, id),
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!result) {
      logger.finding.warn('getById: finding not found', { id, workspaceId });
    }
    return result ?? null;
  },

  /**
   * Update a finding's status.
   * @param id - Finding UUID
   * @param status - New status value
   * @returns Updated finding record or null if not found
   */
  async updateStatus(id: string, status: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.finding.info('updateStatus', { id, status });
    try {
      const [updated] = await exec
        .update(findings)
        .set({ status, updatedAt: new Date() })
        .where(eq(findings.id, id))
        .returning();

      if (!updated) {
        logger.finding.warn('updateStatus: finding not found', { id });
      }
      return updated ?? null;
    } catch (error) {
      logger.finding.error('updateStatus failed', { id, status, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Assign or unassign a finding.
   * @param id - Finding UUID
   * @param assigneeId - User UUID to assign, or null to unassign
   * @returns Updated finding record or null if not found
   */
  async assign(id: string, assigneeId: string | null, tx?: Tx) {
    const exec = tx ?? db;
    logger.finding.info('assign', { id, assigneeId });
    try {
      const [updated] = await exec
        .update(findings)
        .set({ assignedTo: assigneeId, updatedAt: new Date() })
        .where(eq(findings.id, id))
        .returning();

      if (!updated) {
        logger.finding.warn('assign: finding not found', { id });
      }
      return updated ?? null;
    } catch (error) {
      logger.finding.error('assign failed', { id, assigneeId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Bulk update multiple findings by IDs.
   * @param ids - Array of finding UUIDs to update
   * @param payload - Fields to update (status, assignedTo)
   * @returns Array of updated finding records
   */
  async bulkUpdate(ids: string[], payload: BulkUpdatePayload, tx?: Tx) {
    const exec = tx ?? db;
    logger.finding.info('bulkUpdate', { count: ids.length, status: payload.status, assignedTo: payload.assignedTo });
    if (ids.length === 0) {
      logger.finding.warn('bulkUpdate: empty ids array', {});
      return [];
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.status !== undefined) {
      updatePayload.status = payload.status;
    }
    if (payload.assignedTo !== undefined) {
      updatePayload.assignedTo = payload.assignedTo;
    }

    try {
      const updated = await exec
        .update(findings)
        .set(updatePayload)
        .where(inArray(findings.id, ids))
        .returning();

      logger.finding.info('bulkUpdate completed', { requested: ids.length, updated: updated.length });
      return updated;
    } catch (error) {
      logger.finding.error('bulkUpdate failed', { count: ids.length, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },
};
