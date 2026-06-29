import { createScheduleSchema, updateScheduleSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';

import { schedulesRepository } from './schedules.repository';

/**
 * Service responsible for managing Schedules.
 *
 * Schedules define recurring scan execution patterns using cron expressions,
 * linked to repositories and scan profiles.
 */
export const schedulesService = {
  /**
   * Lists all schedules belonging to a workspace.
   */
  async list(workspaceId: string, params?: { page?: number; perPage?: number; search?: string; sort?: string; order?: string }) {
    logger.schedule.info('listSchedules', { workspaceId });
    const result = await schedulesRepository.listByWorkspace(workspaceId, params);
    logger.schedule.info('listSchedules completed', { total: result.total });
    return result;
  },

  /**
   * Retrieves a single schedule by ID within a workspace.
   */
  async getById(workspaceId: string, id: string) {
    logger.schedule.info('getById', { id, workspaceId });
    const schedule = await schedulesRepository.getById(workspaceId, id);
    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }
    logger.schedule.info('getById completed', { id });
    return schedule;
  },

  /**
   * Creates a new schedule for a workspace.
   */
  async create(workspaceId: string, data: unknown, userId: string) {
    logger.schedule.info('create', { workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const parsed = createScheduleSchema.parse(data);

    const result = await schedulesRepository.create({
      workspaceId: workspaceId,
      repositoryId: parsed.repositoryId,
      branch: parsed.branch,
      timezone: parsed.timezone,
      cronExpression: parsed.cronExpression,
      active: parsed.active,
      createdBy: userId,
    });
    logger.schedule.info('create completed', { scheduleId: result.id });
    return result;
  },

  /**
   * Updates an existing schedule.
   */
  async update(workspaceId: string, id: string, data: unknown, userId: string) {
    logger.schedule.info('update', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const existing = await schedulesRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }
    const parsed = updateScheduleSchema.parse(data);

    const updated = await schedulesRepository.update(id, {
      repositoryId: parsed.repositoryId,
      branch: parsed.branch,
      timezone: parsed.timezone,
      cronExpression: parsed.cronExpression,
      active: parsed.active,
    });
    logger.schedule.info('update completed', { id });
    return updated;
  },

  /**
   * Deletes a schedule.
   */
  async delete(workspaceId: string, id: string, userId: string) {
    logger.schedule.info('delete', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const existing = await schedulesRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    await schedulesRepository.delete(id);
    logger.schedule.info('delete completed', { id });
    return existing;
  },

  /**
   * Toggles the active status of a schedule.
   */
  async toggle(workspaceId: string, id: string, userId: string) {
    logger.schedule.info('toggle', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const existing = await schedulesRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    const toggled = await schedulesRepository.toggle(id, !existing.active);
    logger.schedule.info('toggleSchedule completed', { id, active: toggled?.active });
    return toggled;
  },
};
