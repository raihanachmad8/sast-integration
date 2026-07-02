import type { JobWithMetadata } from 'pg-boss';

import { logger } from '@/server/lib/logger';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { aiVerificationService } from '@/server/modules/scan/services/ai-verification.service';
import { findingService } from '@/server/modules/scan/services/finding.service';

interface AiVerifyJobData {
  scanId?: string;
  findingId?: string;
  modelId: string;
  workspaceId?: string;
}

/**
 * Executes one AI verification queue job.
 * Supports both batch verification (by scanId) and single finding verification (by findingId).
 *
 * Retry behavior:
 * - pg-boss retries with exponential backoff (30s, 1m, 2m, 5m, 10m)
 * - After all retries exhausted, finding status is set to 'needs_reverify'
 * - User can manually re-trigger from findings page
 */
export async function processAiVerifyJob(job: JobWithMetadata<AiVerifyJobData>) {
  const { scanId, findingId, modelId, workspaceId } = job.data;
  logger.queue.debug('processAiVerifyJob', { scanId, findingId, modelId, attempt: job.retryCount });

  try {
    if (findingId) {
      // SINGLE finding verification — always update inline after
      try {
        await aiVerificationService.verifyFinding(findingId, modelId, workspaceId);
        logger.queue.debug('processAiVerifyJob single completed', { findingId });
      } catch (verifyErr) {
        logger.queue.warn('processAiVerifyJob verify failed, will still attempt inline update', { findingId, error: (verifyErr as Error).message });
      }

      // Update inline review comment on PR — always attempt, even if AI failed
      try {
        const finding = await findingRepository.findById(findingId);
        if (finding?.groupId) {
          const { findingGroupRepository } = await import('@/server/modules/scan/repositories/finding-group.repository');
          const { aiVerificationRepository } = await import('@/server/modules/scan/repositories/ai-verification.repository');
          const group = await findingGroupRepository.findGroupById(finding.groupId);
          const latestVerdict = await aiVerificationRepository.getLatestByGroup(finding.groupId);

          if (group?.fingerprint && latestVerdict?.verdict && latestVerdict.verdict !== 'error') {
            await findingService.updateInlineCommentsForVerdict({
              fingerprint: group.fingerprint,
              findingId: finding.id,
              filePath: finding.filePath,
              lineNumber: finding.lineNumber,
              scanner: finding.scanner,
              message: finding.message,
              severity: finding.severity,
              rule: finding.rule,
              groupId: finding.groupId,
            }, latestVerdict.verdict, latestVerdict.confidence ? String(latestVerdict.confidence) : null);
            logger.queue.info('processAiVerifyJob: inline comment updated', { findingId, verdict: latestVerdict.verdict });
          }
        }
      } catch (inlineErr) {
        logger.queue.debug('processAiVerifyJob: inline comment update skipped', { findingId, error: (inlineErr as Error).message });
      }

      // Repost PR comment with updated AI verdicts (debounced)
      if (scanId && workspaceId) {
        try {
          const { qualityGateService } = await import('@/server/modules/scan/services/quality-gate.service');
          qualityGateService.repostPrComment(scanId, workspaceId);
        } catch (err) {
          logger.queue.debug('processAiVerifyJob: repostPrComment skipped', { scanId, error: (err as Error).message });
        }
      }
    } else if (scanId) {
      // BATCH verification (manual trigger only)
      const result = await aiVerificationService.verifyFindingsBatch(scanId, modelId, workspaceId);
      logger.queue.debug('processAiVerifyJob batch completed', { scanId, verified: result.verified, failed: result.failed });

      // Update inline for all verified findings
      try {
        const verifiedFindings = await findingRepository.listByScan(scanId, { page: 1, perPage: 1000, status: 'open' });
        for (const f of verifiedFindings.data) {
          if (!f.groupId) continue;
          try {
            const { findingGroupRepository } = await import('@/server/modules/scan/repositories/finding-group.repository');
            const { aiVerificationRepository } = await import('@/server/modules/scan/repositories/ai-verification.repository');
            const group = await findingGroupRepository.findGroupById(f.groupId);
            const latestVerdict = await aiVerificationRepository.getLatestByGroup(f.groupId);

            if (group?.fingerprint && latestVerdict?.verdict && latestVerdict.verdict !== 'error') {
              await findingService.updateInlineCommentsForVerdict({
                fingerprint: group.fingerprint,
                findingId: f.id,
                filePath: f.filePath,
                lineNumber: f.lineNumber,
                scanner: f.scanner,
                message: f.message,
                severity: f.severity,
                rule: f.rule,
                groupId: f.groupId,
              }, latestVerdict.verdict);
            }
          } catch {
            // Individual finding inline update failed — continue with others
          }
        }
      } catch (inlineErr) {
        logger.queue.debug('processAiVerifyJob: batch inline update skipped', { scanId, error: (inlineErr as Error).message });
      }
    } else {
      logger.queue.error('processAiVerifyJob: no scanId or findingId provided', { jobData: job.data });
    }

    // Repost PR comment with updated AI verdicts (debounced, safe to call per finding)
    if (scanId && workspaceId) {
      try {
        const { qualityGateService } = await import('@/server/modules/scan/services/quality-gate.service');
        qualityGateService.repostPrComment(scanId, workspaceId);
      } catch (err) {
        logger.queue.debug('processAiVerifyJob: repostPrComment skipped', { scanId, error: (err as Error).message });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.queue.error('processAiVerifyJob failed', { scanId, findingId, message, attempt: job.retryCount });

    // If this is the last retry, mark finding as needing re-verification
    const isLastRetry = job.retryCount >= (job.retryLimit ?? 5);
    if (isLastRetry && findingId) {
      try {
        // Update finding status to 'needs_reverify' so user knows to re-trigger
        const finding = await findingRepository.findById(findingId);
        if (finding?.groupId) {
          await findingRepository.updateGroupStatus(finding.groupId, 'needs_reverify', 'system');
        }
        logger.queue.info('processAiVerifyJob: finding marked needs_reverify', { findingId });
      } catch (statusError) {
        logger.queue.error('processAiVerifyJob: failed to update finding status', { findingId, error: statusError instanceof Error ? statusError.message : String(statusError) });
      }
    }

    // Re-throw to trigger pg-boss retry
    throw error;
  }
}
