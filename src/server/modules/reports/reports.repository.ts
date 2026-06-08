import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { reports } from '@drizzle/schema/reports';

interface CreateReportInput {
  workspace_id: string;
  type: string;
  title: string;
  filters?: Record<string, unknown> | null;
  file_path?: string;
  file_size?: number;
  format?: string;
  created_by?: string;
  expires_at?: Date;
}

export const reportsRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(reports)
      .where(eq(reports.workspace_id, workspaceId))
      .orderBy(desc(reports.created_at));
  },

  async getById(id: string, workspaceId: string) {
    const [result] = await db
      .select()
      .from(reports)
      .where(
        and(eq(reports.id, id), eq(reports.workspace_id, workspaceId)),
      )
      .limit(1);

    return result ?? null;
  },

  async create(data: CreateReportInput) {
    const [created] = await db
      .insert(reports)
      .values({
        workspace_id: data.workspace_id,
        type: data.type,
        title: data.title,
        filters: data.filters ?? null,
        file_path: data.file_path ?? null,
        file_size: data.file_size ?? null,
        format: data.format ?? null,
        created_by: data.created_by ?? null,
        expires_at: data.expires_at ?? null,
      })
      .returning();

    return created;
  },

  async delete(id: string) {
    await db
      .delete(reports)
      .where(eq(reports.id, id));
  },
};
