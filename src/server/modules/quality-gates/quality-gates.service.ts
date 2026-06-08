import { qualityGatesRepository } from './quality-gates.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { qualityGateConfigSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const qualityGatesService = {
  async getConfig(workspaceId: string) {
    logger.scan.info('get quality gate config', { workspaceId });
    const config = await qualityGatesRepository.getConfig(workspaceId);
    logger.scan.info('get quality gate config completed', { workspaceId, found: !!config });
    return config;
  },

  async updateConfig(data: unknown, workspaceId: string, userId: string) {
    logger.scan.info('update quality gate config', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const parsed = qualityGateConfigSchema.parse(data);
    const result = await qualityGatesRepository.upsertConfig(workspaceId, {
      threshold: parsed.threshold,
      fail_on_critical: parsed.fail_on_critical,
      fail_on_high_tp: parsed.fail_on_high_tp,
      warn_on_pending: parsed.warn_on_pending,
      require_human_ack: parsed.require_human_ack,
      pending_behavior: parsed.pending_behavior,
    });

    logger.scan.info('update quality gate config completed', { workspaceId });
    return result;
  },
};
