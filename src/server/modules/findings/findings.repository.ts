import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';

interface ListByWorkspaceParams {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  projectId?: string;
}

interface BulkUpdatePayload {
  status?: string;
  assignedTo?: string | null;
}

export const findingsRepository = {
  async listByWorkspace(workspaceId: string, params: ListByWorkspaceParams) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(projects.workspaceId, workspaceId),
      isNull(projects.deletedAt),
    ];

    if (params.status) {
      conditions.push(eq(findings.status, params.status));
    }
    if (params.severity) {
      conditions.push(eq(findings.severity, params.severity));
    }
    if (params.projectId) {
      conditions.push(eq(projects.id, params.projectId));
    }

    const where = and(...conditions);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(where)
        .orderBy(desc(findings.createdAt))
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

  async updateStatus(id: string, status: string) {
    const [updated] = await db
      .update(findings)
      .set({ status, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();

    return updated ?? null;
  },

  async assign(id: string, assigneeId: string | null) {
    const [updated] = await db
      .update(findings)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();

    return updated ?? null;
  },

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
