import { reportsRepository, type ReportListParams } from './reports.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { ROLE_PERMISSIONS } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

interface GenerateReportInput {
  type: string;
  title: string;
  format?: string;
  range?: string;
  filters?: Record<string, unknown> | null;
}

export const reportsService = {
  async list(workspaceId: string, params: ReportListParams) {
    logger.report.info('list', { workspaceId, page: params.page });
    const result = await reportsRepository.listByWorkspace(workspaceId, params);
    logger.report.info('list completed', { count: result.data.length, total: result.total });
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

  async generate(data: GenerateReportInput, workspaceId: string, userId: string) {
    logger.report.info('generate', { type: data.type, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
    if (!permissions.includes('report:export')) {
      throw new AppError('You do not have permission to export reports', 403, 'FORBIDDEN');
    }

    // Create report record with "generated" status
    // In a real implementation, this would enqueue an async job to generate the file
    const created = await reportsRepository.create({
      workspaceId: workspaceId,
      type: data.type,
      title: data.title,
      status: 'generated',
      format: data.format ?? 'pdf',
      filters: {
        range: data.range,
        ...data.filters,
      },
      createdBy: userId,
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
