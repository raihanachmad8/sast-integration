import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { schedules } from '@drizzle/schema/scans';
import { AppError } from '@/server/http/errors';
import {
  createScheduleSchema,
  updateScheduleSchema,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from '@/commons/schemas';

/**
 * Service responsible for managing Schedules.
 *
 * Schedules define automated scan execution rules — a cron expression,
 * target branch, timezone, and scan policy that together determine
 * when and how recurring scans are triggered.
 */
export const scheduleService = {
  /**
   * Creates a new schedule for a workspace.
   */
  async createSchedule(workspaceId: string, input: unknown, userId: string) {
    const data = createScheduleSchema.parse(input);

    const [schedule] = await db
      .insert(schedules)
      .values({
        repository_id: data.repositoryId,
        policy_id: data.policyId,
        branch: data.branch,
        timezone: data.timezone,
        cron_expression: data.cronExpression,
        active: data.active,
        created_by: userId,
      })
      .returning();

    return schedule;
  },

  /**
   * Retrieves a single schedule by ID.
   */
  async getScheduleById(id: string) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);

    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    return schedule;
  },

  /**
   * Lists all schedules belonging to a workspace.
   */
  async listSchedulesByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schedules)
      .where(eq(schedules.repository_id, workspaceId));
  },

  /**
   * Updates an existing schedule.
   */
  async updateSchedule(id: string, input: unknown) {
    const data = updateScheduleSchema.parse(input);

    const [updated] = await db
      .update(schedules)
      .set({
        ...(data.repositoryId !== undefined && { repository_id: data.repositoryId }),
        ...(data.policyId !== undefined && { policy_id: data.policyId }),
        ...(data.branch !== undefined && { branch: data.branch }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.cronExpression !== undefined && { cron_expression: data.cronExpression }),
        ...(data.active !== undefined && { active: data.active }),
      })
      .where(eq(schedules.id, id))
      .returning();

    if (!updated) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    return updated;
  },

  /**
   * Deletes a schedule.
   */
  async deleteSchedule(id: string) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);

    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    await db
      .delete(schedules)
      .where(eq(schedules.id, id));
  },
};
