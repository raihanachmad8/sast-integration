import type { FindingListQuery } from '@/commons/schemas/findings.schema';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';

import { FINDING } from './constants';
import { findingsRepository } from './findings.repository';

interface BulkUpdatePayload {
  status?: string;
  assignedTo?: string | null;
}

export const findingsService = {
  /**
   * List findings across a workspace with filtering, sorting, and pagination.
   *
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters (validated by Zod)
   * @param userId - Optional user ID for membership validation. When provided
   *                 (route handler context), membership is enforced. When omitted
   *                 (background job context), validation is skipped.
   * @returns Paginated findings list
   * @throws {AppError} 403 if userId is provided and requester is not a workspace member
   */
  async list(workspaceId: string, params?: FindingListQuery, userId?: string) {
    logger.finding.info('list', { workspaceId });

    if (userId) {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) {
        throw new AppError(FINDING.ERRORS.NOT_MEMBER, 403, FINDING.ERROR_CODE);
      }
    }

    const result = await findingsRepository.listByWorkspace(workspaceId, params);
    logger.finding.info('list completed', { total: result.total });
    return result;
  },

  /**
   * Get a single finding by ID scoped to a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param id - Finding UUID
   * @returns Finding record with joined data
   * @throws {AppError} 404 if finding not found
   */
  async getById(workspaceId: string, id: string) {
    logger.finding.info('getById', { workspaceId, id });
    const result = await findingsRepository.getById(workspaceId, id);
    if (!result) {
      throw new AppError(FINDING.ERRORS.FINDING_NOT_FOUND, 404, FINDING.ERROR_CODE);
    }
    logger.finding.info('getById completed', { workspaceId, id });
    return result;
  },

  /**
   * Update a finding's status.
   *
   * @param workspaceId - Workspace UUID
   * @param id - Finding UUID
   * @param status - New status value
   * @param userId - Actor's user UUID
   * @returns Updated finding record
   * @throws {AppError} 403 if requester is not a workspace member
   * @throws {AppError} 404 if finding not found
   */
  async updateStatus(
    workspaceId: string,
    id: string,
    status: string,
    userId: string,
  ) {
    logger.finding.info('updateStatus', { id, status, workspaceId });

    const role = await findingsRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(FINDING.ERRORS.NOT_MEMBER, 403, FINDING.ERROR_CODE);
    }

    const existing = await findingsRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError(FINDING.ERRORS.FINDING_NOT_FOUND, 404, FINDING.ERROR_CODE);
    }

    const updated = await findingsRepository.updateStatus(id, status);
    logger.finding.info('updateStatus completed', { id, status });
    return updated;
  },

  /**
   * Assign or unassign a finding.
   *
   * @param workspaceId - Workspace UUID
   * @param id - Finding UUID
   * @param assigneeId - User UUID to assign, or null to unassign
   * @param userId - Actor's user UUID
   * @returns Updated finding record
   * @throws {AppError} 403 if requester is not a workspace member
   * @throws {AppError} 404 if finding not found
   */
  async assign(
    workspaceId: string,
    id: string,
    assigneeId: string | null,
    userId: string,
  ) {
    logger.finding.info('assign', { id, assigneeId, workspaceId });

    const role = await findingsRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(FINDING.ERRORS.NOT_MEMBER, 403, FINDING.ERROR_CODE);
    }

    const existing = await findingsRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError(FINDING.ERRORS.FINDING_NOT_FOUND, 404, FINDING.ERROR_CODE);
    }

    const updated = await findingsRepository.assign(id, assigneeId);
    logger.finding.info('assign completed', { id, assigneeId });
    return updated;
  },

  /**
   * Update a finding's AI verdict.
   * Maps verdict to group status: true_positive → open, false_positive → resolved.
   *
   * @param workspaceId - Workspace UUID
   * @param id - Finding UUID
   * @param verdict - AI verdict value (true_positive | false_positive)
   * @param userId - Actor's user UUID
   * @returns Updated finding record
   */
  async updateVerdict(
    workspaceId: string,
    id: string,
    verdict: string,
    userId: string,
  ) {
    logger.finding.info('updateVerdict', { id, verdict, workspaceId });

    const validVerdicts = ['true_positive', 'false_positive'];
    if (!validVerdicts.includes(verdict)) {
      throw new AppError(`Invalid verdict: ${verdict}. Must be one of: ${validVerdicts.join(', ')}`, 400, FINDING.ERROR_CODE);
    }

    const role = await findingsRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(FINDING.ERRORS.NOT_MEMBER, 403, FINDING.ERROR_CODE);
    }

    const existing = await findingsRepository.getById(workspaceId, id);
    if (!existing) {
      throw new AppError(FINDING.ERRORS.FINDING_NOT_FOUND, 404, FINDING.ERROR_CODE);
    }

    // Map verdict → status
    const status = verdict === 'true_positive' ? 'open' : 'resolved';
    const updated = await findingsRepository.updateStatus(id, status);
    logger.finding.info('updateVerdict completed', { id, verdict, status });
    return updated;
  },

  /**
   * Bulk update multiple findings (status or assignment).
   *
   * @param workspaceId - Workspace UUID
   * @param ids - Array of finding UUIDs
   * @param payload - Fields to update
   * @param userId - Actor's user UUID
   * @returns Array of updated finding records
   * @throws {AppError} 403 if requester is not a workspace member
   */
  async bulkUpdate(
    workspaceId: string,
    ids: string[],
    payload: BulkUpdatePayload,
    userId: string,
  ) {
    logger.finding.info('bulkUpdate', { count: ids.length, workspaceId });

    const role = await findingsRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(FINDING.ERRORS.NOT_MEMBER, 403, FINDING.ERROR_CODE);
    }

    const updated = await findingsRepository.bulkUpdate(ids, payload);
    logger.finding.info('bulkUpdate completed', { count: updated.length });
    return updated;
  },
};
