import { eq, and, count, isNull } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildPaginationMeta, buildSort } from '@/server/lib/query';
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
  sort?: string;
  order?: string;
}

export const reportsRepository = {
  /**
   * List reports for a workspace with pagination, search, sort, and pagination meta.
   */
  async listByWorkspace(workspaceId: string, params: ReportListParams, tx?: Tx) {
    logger.report.info('listByWorkspace', { workspaceId, page: params.page });
    const executor = tx ?? db;

    const conditions = [eq(reports.workspaceId, workspaceId)];
    conditions.push(...buildSearch(params.search, reports.title));

    // Count total
    const [{ total }] = await executor
      .select({ total: count() })
      .from(reports)
      .where(and(...conditions));

    // Sort
    const sortExpr = buildSort(
      params.sort, params.order,
      { title: reports.title, type: reports.type, status: reports.status, createdAt: reports.createdAt },
      reports.createdAt,
    );

    // Paginate
    const perPage = params.perPage ?? 10;
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
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((params.page - 1) * perPage);

    logger.report.info('listByWorkspace completed', { workspaceId, count: data.length, total });
    return { data, ...buildPaginationMeta(total, params.page, perPage) };
  },

  /**
   * Get a single report by ID scoped to a workspace.
   */
  async getById(workspaceId: string, id: string, tx?: Tx) {
    logger.report.info('getById', { id, workspaceId });
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

    if (!result) {
      logger.report.warn('getById: report not found', { id, workspaceId });
    }
    return result ?? null;
  },

  /**
   * Create a new report record.
   */
  async create(data: CreateReportInput, tx?: Tx) {
    logger.report.info('create', { workspaceId: data.workspaceId, type: data.type });
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

    logger.report.info('create completed', { reportId: created.id });
    return created;
  },

  /**
   * Update a report's status and optionally its file metadata.
   */
  async updateStatus(id: string, status: string, filePath?: string, fileSize?: number, tx?: Tx) {
    logger.report.info('updateStatus', { id, status });
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

    logger.report.info('updateStatus completed', { id, status });
    return updated ?? null;
  },

  /**
   * Delete a report by ID.
   */
  async delete(id: string, tx?: Tx) {
    logger.report.info('delete', { id });
    const executor = tx ?? db;
    await executor.delete(reports).where(eq(reports.id, id));
    logger.report.info('delete completed', { id });
  },
};
