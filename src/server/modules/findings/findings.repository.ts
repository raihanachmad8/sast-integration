import { eq, and, desc, asc, sql, inArray, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { logger } from '@/server/lib/logger';
interface ListByWorkspaceParams {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  projectId?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

interface BulkUpdatePayload {
  status?: string;
  assignedTo?: string | null;
}

export const findingsRepository = {
  /**
   * List findings across a workspace with pagination and optional filters.
   * @param workspaceId - Workspace UUID
   * @param params - Pagination and filter parameters (page, pageSize, status, severity, projectId)
   * @returns Paginated findings data with total count, page, and pageSize
   */
  async listByWorkspace(workspaceId: string, params: ListByWorkspaceParams) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(projects.workspaceId, workspaceId),
      isNull(projects.deletedAt),
    ];

    if (params.status) {
      conditions.push(eq(findingGroups.status, params.status));
    }
    if (params.severity) {
      conditions.push(eq(findings.severity, params.severity));
    }
    if (params.projectId) {
      conditions.push(eq(projects.id, params.projectId));
    }

    const where = and(...conditions);

    const SORT_COLUMNS = {
      createdAt: findings.createdAt,
      severity: findings.severity,
      scanner: findings.scanner,
    } as const;

    type SortKey = keyof typeof SORT_COLUMNS;
    const sortColumn = params.sort && params.sort in SORT_COLUMNS ? SORT_COLUMNS[params.sort as SortKey] : findings.createdAt;
    const sortOrder = params.order === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(where)
        .orderBy(sortOrder)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(where),
    ]);

    return {
      data,
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  },

  /**
   * Get a single finding by ID scoped to a workspace.
   * @param id - Finding UUID
   * @param workspaceId - Workspace UUID for scoping
   * @returns Finding record joined with group and project data, or null if not found
   */
  async getById(id: string, workspaceId: string) {
    const [result] = await db
      .select()
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .where(
        and(
          eq(findings.id, id),
          eq(projects.workspaceId, workspaceId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    return result ?? null;
  },

  /**
   * Update a finding's status.
   * @param id - Finding UUID
   * @param status - New status value
   * @returns Updated finding record or null if not found
   */
  async updateStatus(id: string, status: string) {
    const [updated] = await db
      .update(findings)
      .set({ status, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();

    return updated ?? null;
  },

  /**
   * Assign or unassign a finding.
   * @param id - Finding UUID
   * @param assigneeId - User UUID to assign, or null to unassign
   * @returns Updated finding record or null if not found
   */
  async assign(id: string, assigneeId: string | null) {
    const [updated] = await db
      .update(findings)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();

    return updated ?? null;
  },

  /**
   * Bulk update multiple findings by IDs.
   * @param ids - Array of finding UUIDs to update
   * @param payload - Fields to update (status, assignedTo)
   * @returns Array of updated finding records
   */
  async bulkUpdate(ids: string[], payload: BulkUpdatePayload) {
    if (ids.length === 0) return [];

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.status !== undefined) {
      updatePayload.status = payload.status;
    }
    if (payload.assignedTo !== undefined) {
      updatePayload.assignedTo = payload.assignedTo;
    }

    const updated = await db
      .update(findings)
      .set(updatePayload)
      .where(inArray(findings.id, ids))
      .returning();

    return updated;
  },
};
