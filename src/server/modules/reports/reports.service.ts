import { reportsRepository } from './reports.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

interface GenerateReportInput {
  type: string;
  title: string;
  filters?: Record<string, unknown> | null;
  file_path?: string;
  file_size?: number;
  format?: string;
  expires_at?: Date;
}

export const reportsService = {
  async list(workspaceId: string) {
    logger.report.info('list', { workspaceId });
    const result = await reportsRepository.listByWorkspace(workspaceId);
    logger.report.info('list completed', { count: result.length });
    return result;
  },

  async getById(id: string, workspaceId: string) {
    logger.report.info('getById', { id, workspaceId });
    const result = await reportsRepository.getById(id, workspaceId);
    if (!result) {
      throw new AppError('Report not found', 404, 'NOT_FOUND');
    }
    logger.report.info('getById completed', { id });
    return result;
  },

  async generate(
    data: GenerateReportInput,
    workspaceId: string,
    userId: string,
  ) {
    logger.report.info('generate', { type: data.type, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const created = await reportsRepository.create({
      workspace_id: workspaceId,
      type: data.type,
      title: data.title,
      filters: data.filters,
      file_path: data.file_path,
      file_size: data.file_size,
      format: data.format,
      created_by: userId,
      expires_at: data.expires_at,
    });

    logger.report.info('generate completed', { reportId: created.id });
    return created;
  },

  async delete(id: string, workspaceId: string, userId: string) {
    logger.report.info('delete', { id, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await reportsRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Report not found', 404, 'NOT_FOUND');
    }

    await reportsRepository.delete(id);
    logger.report.info('delete completed', { id });
  },
};
