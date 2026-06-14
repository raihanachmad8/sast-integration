import { eq, desc, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { auditLogs, activityLogs } from '@drizzle/schema/integrations';

export interface ListLogsParams {
  page?: number;
  limit?: number;
}

export interface ListActivityLogsParams {
  page?: number;
  limit?: number;
}

export const auditRepository = {
  async listLogs(workspaceId: string, params: ListLogsParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, workspaceId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, workspaceId)),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  },

  async listActivityLogs(workspaceId: string, params: ListActivityLogsParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.workspaceId, workspaceId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(activityLogs)
        .where(eq(activityLogs.workspaceId, workspaceId)),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  },
};
