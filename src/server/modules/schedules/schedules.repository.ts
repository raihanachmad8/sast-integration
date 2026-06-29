import { eq, and, isNull, count } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { schedules } from '@drizzle/schema/scans';

export interface CreateScheduleInput {
  workspaceId: string;
  repositoryId?: string;
  branch?: string;
  timezone?: string;
  cronExpression: string;
  active?: boolean;
  createdBy: string;
}

export interface UpdateScheduleInput {
  repositoryId?: string;
  branch?: string;
  timezone?: string;
  cronExpression?: string;
  active?: boolean;
}

export interface ScheduleListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: string;
}

export const schedulesRepository = {
  /**
   * List non-deleted schedules in a workspace with search, sort, and pagination.
   */
  async listByWorkspace(workspaceId: string, params?: ScheduleListParams, tx?: Tx) {
    logger.schedule.info('listByWorkspace', { workspaceId });
    const executor = tx ?? db;

    const conditions = [
      eq(schedules.workspaceId, workspaceId),
      isNull(schedules.deletedAt),
      ...buildSearch(params?.search, schedules.cronExpression),
    ];

    // Count total
    const [{ total }] = await executor
      .select({ total: count() })
      .from(schedules)
      .where(and(...conditions));

    const sortExpr = buildSort(
      params?.sort, params?.order,
      { cronExpression: schedules.cronExpression, branch: schedules.branch, active: schedules.active, createdAt: schedules.createdAt },
      schedules.createdAt,
    );

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const rows = await executor
      .select()
      .from(schedules)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.schedule.info('listByWorkspace completed', { workspaceId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * Get a non-deleted schedule by ID scoped to a workspace.
   */
  async getById(workspaceId: string, id: string, tx?: Tx) {
    logger.schedule.info('getById', { id, workspaceId });
    const executor = tx ?? db;
    const [schedule] = await executor
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.workspaceId, workspaceId), isNull(schedules.deletedAt)))
      .limit(1);
    if (!schedule) {
      logger.schedule.warn('getById: schedule not found', { id, workspaceId });
    }
    return schedule ?? null;
  },

  /**
   * Create a new schedule record.
   */
  async create(data: CreateScheduleInput, tx?: Tx) {
    logger.schedule.info('create', { workspaceId: data.workspaceId, cronExpression: data.cronExpression });
    const executor = tx ?? db;
    const [schedule] = await executor
      .insert(schedules)
      .values({
        workspaceId: data.workspaceId,
        repositoryId: data.repositoryId,
        branch: data.branch,
        timezone: data.timezone ?? 'UTC',
        cronExpression: data.cronExpression,
        active: data.active ?? true,
        createdBy: data.createdBy,
      })
      .returning();
    logger.schedule.info('create completed', { scheduleId: schedule.id });
    return schedule;
  },

  /**
   * Update a schedule record.
   */
  async update(id: string, data: UpdateScheduleInput, tx?: Tx) {
    logger.schedule.info('update', { id });
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();
    logger.schedule.info('update completed', { id });
    return schedule ?? null;
  },

  /**
   * Soft-delete a schedule by setting deletedAt timestamp.
   */
  async delete(id: string, tx?: Tx) {
    logger.schedule.info('delete', { id });
    const executor = tx ?? db;
    await executor
      .update(schedules)
      .set({ deletedAt: new Date() })
      .where(eq(schedules.id, id));
    logger.schedule.info('delete completed', { id });
  },

  /**
   * Toggle a schedule's active state.
   */
  async toggle(id: string, active: boolean, tx?: Tx) {
    logger.schedule.info('toggle', { id, active });
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({ active, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    logger.schedule.info('toggle completed', { id, active });
    return schedule ?? null;
  },
};
