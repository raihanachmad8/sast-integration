import { eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { aiVerificationRepository } from '@/server/modules/scan/repositories/ai-verification.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { createScmApiService, parseRepoName } from '@/server/modules/source-control/scm-api.service';
import { findingGroups } from '@drizzle/schema/findings';
import { sourceControls } from '@drizzle/schema/source-controls';

type BulkAction = 'dismiss' | 'resolve' | 'reverify' | 'assign';

interface BulkActionParams {
  workspaceId: string;
  ids: string[];
  action: BulkAction;
  assignedTo?: string;
  userId?: string;
}

interface BulkActionResult {
  processed: number;
  action: string;
}

export const findingBulkService = {
  /**
   * Execute a bulk action on multiple findings.
   * Dispatches to the appropriate handler based on action type.
   */
  async execute(params: BulkActionParams): Promise<BulkActionResult> {
    const { workspaceId, ids, action, assignedTo, userId } = params;

    logger.finding.info('bulk:execute', { workspaceId, action, count: ids.length });

    switch (action) {
      case 'dismiss':
        return this.dismiss(workspaceId, ids, userId);

      case 'resolve':
        return this.resolve(workspaceId, ids, userId);

      case 'reverify':
        return this.reverify(workspaceId, ids);

      case 'assign':
        if (!assignedTo) {
          logger.finding.warn('bulk:assign called without assignedTo', { ids: ids.length });
          return { processed: 0, action };
        }
        return this.assign(workspaceId, ids, assignedTo);

      default:
        logger.finding.warn('bulk: unknown action', { action });
        return { processed: 0, action };
    }
  },

  /**
   * Dismiss multiple findings (status → 'dismissed').
   */
  async dismiss(workspaceId: string, ids: string[], userId?: string): Promise<BulkActionResult> {
    const scannedIds = new Set<string>();
    const fingerprintGroups: Array<{ groupId: string; scanId: string | null }> = [];
    let processed = 0;

    for (const id of ids) {
      try {
        const finding = await findingRepository.findById(id);
        if (finding?.groupId) {
          await findingRepository.updateGroupStatus(finding.groupId, 'dismissed', userId ?? null);
          if (finding.scanId) scannedIds.add(finding.scanId);
          fingerprintGroups.push({ groupId: finding.groupId, scanId: finding.scanId });
          processed++;
        }
      } catch {
        // Skip individual failures
      }
    }

    // Resolve inline comments on PRs (non-blocking)
    this.resolveInlineCommentsForGroups(workspaceId, scannedIds, fingerprintGroups);

    // Re-evaluate QG for affected scans (non-blocking)
    this.repostAffectedScans(workspaceId, scannedIds);

    logger.finding.info('bulk:dismiss completed', { processed, total: ids.length });
    return { processed, action: 'dismiss' };
  },

  /**
   * Resolve multiple findings (status → 'resolved').
   */
  async resolve(workspaceId: string, ids: string[], userId?: string): Promise<BulkActionResult> {
    const scannedIds = new Set<string>();
    const fingerprintGroups: Array<{ groupId: string; scanId: string | null }> = [];
    let processed = 0;

    for (const id of ids) {
      try {
        const finding = await findingRepository.findById(id);
        if (finding?.groupId) {
          await findingRepository.updateGroupStatus(finding.groupId, 'resolved', userId ?? null);
          if (finding.scanId) scannedIds.add(finding.scanId);
          fingerprintGroups.push({ groupId: finding.groupId, scanId: finding.scanId });
          processed++;
        }
      } catch {
        // Skip individual failures
      }
    }

    // Resolve inline comments on PRs (non-blocking)
    this.resolveInlineCommentsForGroups(workspaceId, scannedIds, fingerprintGroups);

    // Re-evaluate QG for affected scans (non-blocking)
    this.repostAffectedScans(workspaceId, scannedIds);

    logger.finding.info('bulk:resolve completed', { processed, total: ids.length });
    return { processed, action: 'resolve' };
  },

  /**
   * Re-verify multiple findings via AI (enqueue to queue).
   */
  async reverify(workspaceId: string, ids: string[]): Promise<BulkActionResult> {
    const { enqueue } = await import('@/server/modules/queue/queue.service');
    const model = await aiVerificationRepository.getPrimaryModel();
    if (!model) {
      logger.finding.warn('bulk:reverify — no primary AI model configured');
      return { processed: 0, action: 'reverify' };
    }

    let processed = 0;
    for (const findingId of ids) {
      try {
        await enqueue('ai-verify-finding', {
          findingId,
          modelId: model.id,
          workspaceId,
        }, { retryLimit: 5, retryDelay: 30 });
        processed++;
      } catch (err) {
        logger.finding.warn('bulk:reverify — enqueue failed', { findingId, error: (err as Error).message });
      }
    }

    logger.finding.info('bulk:reverify completed', { processed, total: ids.length });
    return { processed, action: 'reverify' };
  },

  /**
   * Assign multiple findings to a member.
   */
  async assign(workspaceId: string, ids: string[], assignedTo: string): Promise<BulkActionResult> {
    let processed = 0;

    for (const id of ids) {
      try {
        await findingRepository.updateAssignment(id, assignedTo);
        processed++;
      } catch {
        // Skip individual failures
      }
    }

    logger.finding.info('bulk:assign completed', { processed, total: ids.length, assignedTo });
    return { processed, action: 'assign' };
  },

  /**
   * Resolve inline comments on PRs for dismissed/resolved group fingerprints (non-blocking).
   */
  async resolveInlineCommentsForGroups(workspaceId: string, scanIds: Set<string>, groupEntries: Array<{ groupId: string; scanId: string | null }>) {
    if (groupEntries.length === 0) return;

    const groupIds = [...new Set(groupEntries.map(e => e.groupId))];
    const fingerRows = await db.select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint })
      .from(findingGroups)
      .where(inArray(findingGroups.id, groupIds));
    const fingerMap = new Map(fingerRows.map(r => [r.id, r.fingerprint]));

    const [sc] = await db.select().from(sourceControls).where(eq(sourceControls.workspaceId, workspaceId)).limit(1);
    if (!sc?.credentials) return;
    const scmCreds = sc.credentials as { baseUrl?: string; token?: string };
    if (!scmCreds.token) return;

    for (const scanId of scanIds) {
      scanRepository.getById(scanId).then(async (scan) => {
        if (!scan?.prNumber || !scan?.repositoryId) return;
        try {
          const repo = await repositoriesRepository.getById(workspaceId, scan.repositoryId);
          if (!repo) return;

          const fingerprints = groupEntries
            .map(e => fingerMap.get(e.groupId))
            .filter((fp): fp is string => !!fp);
          if (fingerprints.length === 0) return;

          const scm = createScmApiService(sc.provider, { baseUrl: scmCreds.baseUrl ?? '', token: scmCreds.token ?? '' });
          const [owner, repoName] = parseRepoName(repo.name);
          const result = await scm.resolveInlineReviewComments(owner, repoName, scan.prNumber!, fingerprints);
          logger.scan.info('bulk: inline comments resolved', { scanId, resolved: result.resolved, failed: result.failed });
        } catch (err) {
          logger.scan.warn('bulk: inline comment resolve failed (non-critical)', { scanId, error: (err as Error).message });
        }
      }).catch(() => {});
    }
  },

  /**
   * Re-evaluate quality gate for affected scans (non-blocking).
   */
  repostAffectedScans(workspaceId: string, scanIds: Set<string>) {
    for (const scanId of scanIds) {
      scanRepository.getById(scanId).then(async (scan) => {
        if (!scan?.prNumber || !scan?.baseBranch || !scan?.headBranch || !scan?.repositoryId) return;
        try {
          await qualityGateService.repostPrComment(scan.id, workspaceId);
        } catch (err) {
          logger.scan.warn('bulk: QG repost failed', { scanId, error: (err as Error).message });
        }
      }).catch(() => {});
    }
  },
};
