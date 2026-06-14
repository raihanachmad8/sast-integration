import { schedulesRepository } from './schedules.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createScheduleSchema, updateScheduleSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

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
  async list(workspaceId: string) {
    logger.schedule.info('listSchedules', { workspaceId });
    const result = await schedulesRepository.listByWorkspace(workspaceId);
    logger.schedule.info('listSchedules completed', { count: result.length });
    return result;
  },

  /**
   * Retrieves a single schedule by ID within a workspace.
   */
  async getById(id: string, workspaceId: string) {
    logger.schedule.info('getScheduleById', { id, workspaceId });
    const schedule = await schedulesRepository.getById(id, workspaceId);
    if (!schedule) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }
    logger.schedule.info('getScheduleById completed', { id });
    return schedule;
  },

  /**
   * Creates a new schedule for a workspace.
   */
  async create(data: unknown, workspaceId: string, userId: string) {
    logger.schedule.info('createSchedule', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
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
    logger.schedule.info('createSchedule completed', { scheduleId: result.id });
    return result;
  },

  /**
   * Updates an existing schedule.
   */
  async update(id: string, data: unknown, workspaceId: string, userId: string) {
    logger.schedule.info('updateSchedule', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await schedulesRepository.getById(id, workspaceId);
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
    logger.schedule.info('updateSchedule completed', { id });
    return updated;
  },

  /**
   * Deletes a schedule.
   */
  async delete(id: string, workspaceId: string, userId: string) {
    logger.schedule.info('deleteSchedule', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await schedulesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    await schedulesRepository.delete(id);
    logger.schedule.info('deleteSchedule completed', { id });
    return existing;
  },

  /**
   * Toggles the active status of a schedule.
   */
  async toggle(id: string, workspaceId: string, userId: string) {
    logger.schedule.info('toggleSchedule', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await schedulesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Schedule not found', 404, 'NOT_FOUND');
    }

    const toggled = await schedulesRepository.toggle(id, !existing.active);
    logger.schedule.info('toggleSchedule completed', { id, active: toggled?.active });
    return toggled;
  },
};
