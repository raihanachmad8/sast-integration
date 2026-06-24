import { qualityGatesRepository } from './quality-gates.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { qualityGateConfigSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const qualityGatesService = {
  /**
   * Retrieve the quality gate configuration for a workspace.
   * Creates a default config if none exists.
   *
   * @param workspaceId - Workspace UUID to fetch the config for
   * @returns Quality gate configuration record
   */
  async getConfig(workspaceId: string) {
    logger.scan.info('get quality gate config', { workspaceId });
    let config = await qualityGatesRepository.getConfig(workspaceId);

    if (!config) {
      logger.scan.info('No config found, creating default', { workspaceId });
      try {
        config = await qualityGatesRepository.upsertConfig(workspaceId, {
          threshold: 'medium',
          failOnCritical: true,
          failOnHighTp: true,
          failOnHigh: true,
          failOnMedium: false,
          failOnLow: false,
          failOnPending: true,
          failOnTp: false,
          warnOnPending: true,
          requireHumanAck: false,
          pendingBehavior: 'warn',
        });
      } catch (error) {
        logger.scan.error('Failed to create default config', { workspaceId, error: error instanceof Error ? error.message : error });
        throw error;
      }
    }

    logger.scan.info('get quality gate config completed', { workspaceId, found: !!config });
    return config;
  },

  /**
   * Create or update the quality gate configuration for a workspace.
   *
   * Validates the user is a workspace member, parses and validates the config
   * data against the quality gate schema, then upserts the configuration.
   *
   * @param data - Raw configuration data (validated against qualityGateConfigSchema)
   * @param workspaceId - Workspace UUID to update the config for
   * @param userId - User UUID requesting the update
   * @returns Upserted quality gate configuration record
   * @throws {AppError} If the user is not a workspace member (403)
   */
  async updateConfig(data: unknown, workspaceId: string, userId: string) {
    logger.scan.info('update quality gate config', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const parsed = qualityGateConfigSchema.parse(data);
    const result = await qualityGatesRepository.upsertConfig(workspaceId, {
      threshold: parsed.threshold,
      failOnCritical: parsed.failOnCritical,
      failOnHighTp: parsed.failOnHighTp,
      failOnHigh: parsed.failOnHigh,
      failOnMedium: parsed.failOnMedium,
      failOnLow: parsed.failOnLow,
      failOnPending: parsed.failOnPending,
      failOnTp: parsed.failOnTp,
      warnOnPending: parsed.warnOnPending,
      requireHumanAck: parsed.requireHumanAck,
      pendingBehavior: parsed.pendingBehavior,
    });

    logger.scan.info('update quality gate config completed', { workspaceId });
    return result;
  },
};
