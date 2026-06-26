import { eq, and, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { schedules } from '@drizzle/schema/scans';
import { logger } from '@/server/lib/logger';
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

export const schedulesRepository = {
  /**
   * List all non-deleted schedules in a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Array of schedule records
   */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schedules)
      .where(and(eq(schedules.workspaceId, workspaceId), isNull(schedules.deletedAt)));
  },

  /**
   * Get a non-deleted schedule by ID scoped to a workspace.
   * @param id - Schedule UUID
   * @param workspaceId - Workspace UUID for scoping
   * @returns Schedule record or null if not found
   */
  async getById(id: string, workspaceId: string) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.workspaceId, workspaceId), isNull(schedules.deletedAt)))
      .limit(1);
    return schedule ?? null;
  },

  /**
   * Create a new schedule record.
   * @param data - Schedule input data (workspaceId, cronExpression, optional fields)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created schedule record
   */
  async create(data: CreateScheduleInput, tx?: Tx) {
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
    return schedule;
  },

  /**
   * Update a schedule record.
   * @param id - Schedule UUID
   * @param data - Fields to update
   * @param tx - Optional transaction context
   * @returns Updated schedule record or null if not found
   */
  async update(id: string, data: UpdateScheduleInput, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },

  /**
   * Soft-delete a schedule by setting deletedAt timestamp.
   * @param id - Schedule UUID
   * @param tx - Optional transaction context
   */
  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor
      .update(schedules)
      .set({ deletedAt: new Date() })
      .where(eq(schedules.id, id));
  },

  /**
   * Toggle a schedule's active state.
   * @param id - Schedule UUID
   * @param active - New active state
   * @param tx - Optional transaction context
   * @returns Updated schedule record or null if not found
   */
  async toggle(id: string, active: boolean, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({ active, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },
};
