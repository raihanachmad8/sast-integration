import { eq, and, desc, count, ilike, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { getOffset } from '@/lib/pagination';
import { reports } from '@drizzle/schema/reports';
import { users } from '@drizzle/schema/users';
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
  /**
   * List reports for a workspace with pagination and optional search.
   * @param workspaceId - Workspace UUID
   * @param params - Pagination and search parameters
   * @param tx - Optional transaction context
   * @returns Paginated report data with author names and total count
   */
  async listByWorkspace(workspaceId: string, params: ReportListParams, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);

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

  /**
   * Get a single report by ID scoped to a workspace.
   * @param id - Report UUID
   * @param workspaceId - Workspace UUID for scoping
   * @param tx - Optional transaction context
   * @returns Report record with author name, or null if not found
   */
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

  /**
   * Create a new report record.
   * @param data - Report input data
   * @param tx - Optional transaction context
   * @returns Created report record
   */
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

  /**
   * Update a report's status and optionally its file metadata.
   * @param id - Report UUID
   * @param status - New status value
   * @param filePath - Optional file path to set
   * @param fileSize - Optional file size in bytes
   * @param tx - Optional transaction context
   * @returns Updated report record or null if not found
   */
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

  /**
   * Delete a report by ID.
   * @param id - Report UUID
   * @param tx - Optional transaction context
   */
  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(reports).where(eq(reports.id, id));
  },
};
