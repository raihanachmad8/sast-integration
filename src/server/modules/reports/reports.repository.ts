import { eq, and, desc, count, ilike, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { reports } from '@drizzle/schema/reports';
import { users } from '@drizzle/schema/users';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateReportInput {
  workspaceId: string;
  type: string;
  title: string;
  status?: string;
  filters?: Record<string, unknown> | null;
  filePath?: string;
  fileSize?: number;
  format?: string;
  createdBy?: string;
  expiresAt?: Date;
}

export interface ReportListParams {
  page: number;
  perPage: number;
  search?: string;
}

export const reportsRepository = {
  async listByWorkspace(workspaceId: string, params: ReportListParams, tx?: Tx) {
    const executor = tx ?? db;
    const offset = (params.page - 1) * params.perPage;

    const conditions = [eq(reports.workspaceId, workspaceId)];
    if (params.search) {
      conditions.push(ilike(reports.title, `%${params.search}%`));
    }

    // Get data with author name JOIN
    const data = await executor
      .select({
        id: reports.id,
        workspaceId: reports.workspaceId,
        type: reports.type,
        title: reports.title,
        status: reports.status,
        filters: reports.filters,
        filePath: reports.filePath,
        fileSize: reports.fileSize,
        format: reports.format,
        createdAt: reports.createdAt,
        createdBy: reports.createdBy,
        createdByName: users.name,
      })
      .from(reports)
      .leftJoin(users, and(eq(reports.createdBy, users.id), isNull(users.deletedAt)))
      .where(and(...conditions))
      .orderBy(desc(reports.createdAt))
      .limit(params.perPage)
      .offset(offset);

    // Get total count
    const [{ total }] = await executor
      .select({ total: count() })
      .from(reports)
      .where(and(...conditions));

    return { data, total };
  },

  async getById(id: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [result] = await executor
      .select({
        id: reports.id,
        workspaceId: reports.workspaceId,
        type: reports.type,
        title: reports.title,
        status: reports.status,
        filters: reports.filters,
        filePath: reports.filePath,
        fileSize: reports.fileSize,
        format: reports.format,
        createdAt: reports.createdAt,
        createdBy: reports.createdBy,
        createdByName: users.name,
      })
      .from(reports)
      .leftJoin(users, and(eq(reports.createdBy, users.id), isNull(users.deletedAt)))
      .where(and(eq(reports.id, id), eq(reports.workspaceId, workspaceId)))
      .limit(1);

    return result ?? null;
  },

  async create(data: CreateReportInput, tx?: Tx) {
    const executor = tx ?? db;
    const [created] = await executor
      .insert(reports)
      .values({
        workspaceId: data.workspaceId,
        type: data.type,
        title: data.title,
        status: data.status ?? 'generated',
        filters: data.filters ?? null,
        filePath: data.filePath ?? null,
        fileSize: data.fileSize ?? null,
        format: data.format ?? null,
        createdBy: data.createdBy ?? null,
        expiresAt: data.expiresAt ?? null,
      })
      .returning();

    return created;
  },

  async updateStatus(id: string, status: string, filePath?: string, fileSize?: number, tx?: Tx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(reports)
      .set({
        status,
        ...(filePath !== undefined && { filePath: filePath }),
        ...(fileSize !== undefined && { fileSize: fileSize }),
      })
      .where(eq(reports.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(reports).where(eq(reports.id, id));
  },
};
