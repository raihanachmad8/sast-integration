import { workspaceSettingsRepository } from '../repositories/workspace-settings.repository';
import { logger } from '@/server/lib/logger';

const PR_REVIEW_SETTINGS_KEY = 'pr_review_settings';

export interface PrReviewSettings {
  postPrSummaryComment: boolean;
  inlineCodeAnnotations: boolean;
  publishQualityGateStatus: boolean;
  statusContext: string;
  reviewSummaryFormat: 'compact' | 'detailed';
}

const DEFAULT_PR_REVIEW_SETTINGS: PrReviewSettings = {
  postPrSummaryComment: true,
  inlineCodeAnnotations: true,
  publishQualityGateStatus: true,
  statusContext: 'sast-integration/gate',
  reviewSummaryFormat: 'compact',
};

export const workspaceSettingsService = {
  /**
   * Get PR review settings for a workspace.
   * Returns default settings if none configured.
   */
  async getPrReviewSettings(workspaceId: string): Promise<PrReviewSettings> {
    logger.workspace.info('getPrReviewSettings', { workspaceId });

    const value = await workspaceSettingsRepository.getByKey(workspaceId, PR_REVIEW_SETTINGS_KEY);
    
    if (!value) {
      logger.workspace.info('getPrReviewSettings completed', { workspaceId, usingDefaults: true });
      return DEFAULT_PR_REVIEW_SETTINGS;
    }

    try {
      const settings = JSON.parse(value) as PrReviewSettings;
      logger.workspace.info('getPrReviewSettings completed', { workspaceId });
      return settings;
    } catch {
      logger.workspace.warn('getPrReviewSettings: invalid JSON, using defaults', { workspaceId });
      return DEFAULT_PR_REVIEW_SETTINGS;
    }
  },

  /**
   * Update PR review settings for a workspace.
   */
  async updatePrReviewSettings(workspaceId: string, settings: Partial<PrReviewSettings>): Promise<PrReviewSettings> {
    logger.workspace.info('updatePrReviewSettings', { workspaceId });

    const current = await this.getPrReviewSettings(workspaceId);
    const updated = { ...current, ...settings };

    await workspaceSettingsRepository.set(workspaceId, PR_REVIEW_SETTINGS_KEY, JSON.stringify(updated));

    logger.workspace.info('updatePrReviewSettings completed', { workspaceId });
    return updated;
  },
};
