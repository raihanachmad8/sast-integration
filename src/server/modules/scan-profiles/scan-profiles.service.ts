import { scanProfilesRepository } from './scan-profiles.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createScanProfileSchema, updateScanProfileSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const scanProfilesService = {
  async list(workspaceId: string) {
    logger.scan.info('list scan profiles', { workspaceId });
    const result = await scanProfilesRepository.listByWorkspace(workspaceId);
    logger.scan.info('list scan profiles completed', { count: result.length });
    return result;
  },

  async getById(id: string, workspaceId: string) {
    logger.scan.info('get scan profile by id', { id, workspaceId });
    const profile = await scanProfilesRepository.getById(id, workspaceId);
    if (!profile) {
      throw new AppError('Scan profile not found', 404, 'NOT_FOUND');
    }
    logger.scan.info('get scan profile by id completed', { id });
    return profile;
  },

  async create(data: unknown, workspaceId: string, userId: string) {
    logger.scan.info('create scan profile', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const parsed = createScanProfileSchema.parse(data);
    const result = await scanProfilesRepository.create({
      workspace_id: workspaceId,
      name: parsed.name,
      profile: parsed.profile,
      scanners: parsed.scanners,
      ai_verification: parsed.aiVerification ? 'enabled' : 'disabled',
      severity_threshold: parsed.severityThreshold,
      timeout_seconds: parsed.timeoutSeconds,
      max_findings: parsed.maxFindings,
    });

    logger.scan.info('create scan profile completed', { profileId: result.id });
    return result;
  },

  async update(id: string, data: unknown, workspaceId: string, userId: string) {
    logger.scan.info('update scan profile', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await scanProfilesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Scan profile not found', 404, 'NOT_FOUND');
    }

    const parsed = updateScanProfileSchema.parse(data);
    const result = await scanProfilesRepository.update(id, {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.profile !== undefined && { profile: parsed.profile }),
      ...(parsed.scanners !== undefined && { scanners: parsed.scanners }),
      ...(parsed.aiVerification !== undefined && { ai_verification: parsed.aiVerification ? 'enabled' : 'disabled' }),
      ...(parsed.severityThreshold !== undefined && { severity_threshold: parsed.severityThreshold }),
      ...(parsed.timeoutSeconds !== undefined && { timeout_seconds: parsed.timeoutSeconds }),
      ...(parsed.maxFindings !== undefined && { max_findings: parsed.maxFindings }),
    });

    if (!result) {
      throw new AppError('Scan profile not found', 404, 'NOT_FOUND');
    }

    logger.scan.info('update scan profile completed', { id });
    return result;
  },

  async delete(id: string, workspaceId: string, userId: string) {
    logger.scan.info('delete scan profile', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await scanProfilesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Scan profile not found', 404, 'NOT_FOUND');
    }

    await scanProfilesRepository.delete(id);
    logger.scan.info('delete scan profile completed', { id });
  },
};
