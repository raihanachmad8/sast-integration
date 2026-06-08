import { eq, desc, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans, scanResults } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';

export const scanRepository = {
  async listByWorkspace(workspaceId: string, params: { page: number; per_page: number }) {
    const offset = (params.page - 1) * params.per_page;
    const data = await db.select({
      id: scans.id,
      repositoryId: scans.repository_id,
      status: scans.status,
      branch: scans.branch,
      origin: scans.origin,
      startedAt: scans.started_at,
      completedAt: scans.completed_at,
      createdAt: scans.created_at,
    }).from(scans).innerJoin(repositories, eq(scans.repository_id, repositories.id))
      .where(eq(repositories.workspace_id, workspaceId))
      .orderBy(desc(scans.created_at))
      .limit(params.per_page).offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(scans)
      .innerJoin(repositories, eq(scans.repository_id, repositories.id))
      .where(eq(repositories.workspace_id, workspaceId));

    return { data, total };
  },

  async getById(id: string) {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
    return scan ?? null;
  },

  async getScanResults(scanId: string) {
    return db.select().from(scanResults).where(eq(scanResults.scan_id, scanId));
  },

  async create(data: { repository_id: string; branch: string; origin: string; status: string; created_by?: string }) {
    const [scan] = await db.insert(scans).values(data).returning();
    return scan;
  },

  async updateStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'running') updates.started_at = new Date();
    if (status === 'completed' || status === 'failed') updates.completed_at = new Date();
    const [scan] = await db.update(scans).set(updates).where(eq(scans.id, id)).returning();
    return scan;
  },
};
