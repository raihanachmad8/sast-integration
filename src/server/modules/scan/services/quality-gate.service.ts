import { logger } from '@/server/lib/logger';
import { qualityGateRepository } from '../repositories/quality-gate.repository';
import { findingRepository } from '../repositories/finding.repository';
import { scanRepository } from '../repositories/scan.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createScmApiService, parseRepoName, buildPrComment } from '@/server/modules/source-control/scm-api.service';
import type { ChangedFile } from '@/server/modules/source-control/scm-api.service';
import { repositories } from '@drizzle/schema/source-controls';
import { sourceControls } from '@drizzle/schema/source-controls';
import { workspaces } from '@drizzle/schema/workspaces';
import { db } from '@/server/db/client';
import { eq } from 'drizzle-orm';
import { AppError } from '@/server/http/errors';
import { SCAN } from '../constants';

export const qualityGateService = {
  /**
   * Get quality gate configuration for a workspace.
   * Creates a default config if none exists.
   *
   * @param workspaceId - Workspace UUID
   * @returns Quality gate configuration record
   */
  async getConfig(workspaceId: string) {
    logger.scan.debug('getConfig', { workspaceId });

    try {
      let gate = await qualityGateRepository.findByWorkspace(workspaceId);

      if (!gate) {
        gate = await qualityGateRepository.upsert(workspaceId, {
          threshold: 'high',
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
      }

      logger.scan.debug('getConfig completed', { workspaceId, gateId: gate.id });
      return gate;
    } catch (error) {
      logger.scan.error('getConfig failed', { error, workspaceId });
      throw error;
    }
  },

  /**
   * Update quality gate configuration for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param data - Updated gate settings
   * @param userId - User performing the update
   * @returns Updated quality gate record
   */
  async updateConfig(workspaceId: string, data: {
    threshold?: string;
    failOnCritical?: boolean;
    failOnHighTp?: boolean;
    failOnHigh?: boolean;
    failOnMedium?: boolean;
    failOnLow?: boolean;
    failOnPending?: boolean;
    failOnTp?: boolean;
    warnOnPending?: boolean;
    requireHumanAck?: boolean;
    pendingBehavior?: string;
  }, userId: string) {
    logger.scan.info('updateConfig', { workspaceId, userId });

    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) {
        throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      }

      const result = await qualityGateRepository.upsert(workspaceId, data);
      logger.scan.info('updateConfig completed', { workspaceId, gateId: result.id });
      return result;
    } catch (error) {
      logger.scan.error('updateConfig failed', { error, workspaceId });
      throw error;
    }
  },

  /**
   * Evaluate a scan against the workspace's quality gate rules.
   *
   * Checks findings against severity thresholds, AI verification status,
   * and human acknowledgement requirements.
   *
   * @param scanId - Scan UUID to evaluate
   * @param workspaceId - Workspace UUID for gate config lookup
   * @param projectId - Project UUID for finding retrieval
   * @returns Evaluation result with status, gate config, and finding counts
   */
  async evaluateScan(scanId: string, workspaceId: string, projectId: string) {
    logger.scan.info('evaluateScan', { scanId, workspaceId, projectId });

    try {
      const gate = await this.getConfig(workspaceId);

      const findings = await findingRepository.listByScan(scanId, {
        page: 1,
        perPage: 1000,
      });

      const blockingFindings = countBlockingFindings(findings.data, gate);
      const openFindings = findings.data.filter((f) => (f.groupStatus ?? 'open') === 'open');
      const tpFindings = findings.data.filter((f) => f.verdict === 'TP');

      let status: 'passed' | 'failed' | 'warning' = 'passed';

      if (gate.failOnCritical && blockingFindings.critical > 0) {
        status = 'failed';
      }
      if (gate.failOnHigh && blockingFindings.high > 0) {
        status = 'failed';
      }
      if (gate.failOnMedium && blockingFindings.medium > 0) {
        status = 'failed';
      }
      if (gate.failOnLow && blockingFindings.low > 0) {
        status = 'failed';
      }

      if (gate.failOnPending && openFindings.length > 0 && status === 'passed') {
        status = 'failed';
      }

      if (gate.failOnTp && tpFindings.length > 0 && status === 'passed') {
        status = 'failed';
      }

      if (status === 'passed' && gate.warnOnPending && openFindings.length > 0) {
        status = 'warning';
      }

      const totalBlocking = blockingFindings.critical + blockingFindings.high + blockingFindings.medium + blockingFindings.low;

      const result = await qualityGateRepository.createResult({
        scanId,
        gateId: gate.id,
        status,
        blockingFindings: totalBlocking,
        pendingFindings: openFindings.length,
      });

      const evaluation = {
        status,
        gate: {
          threshold: gate.threshold,
          failOnCritical: gate.failOnCritical,
          failOnHighTp: gate.failOnHighTp,
          failOnHigh: gate.failOnHigh,
          failOnMedium: gate.failOnMedium,
          failOnLow: gate.failOnLow,
          failOnPending: gate.failOnPending,
          failOnTp: gate.failOnTp,
          warnOnPending: gate.warnOnPending,
        },
        findings: {
          total: findings.total,
          blocking: totalBlocking,
          pending: openFindings.length,
        },
        newFindingsData: [],
        result,
      };

      logger.scan.info('evaluateScan completed', { scanId, workspaceId, status, totalFindings: findings.total });
      return evaluation;
    } catch (error) {
      logger.scan.error('evaluateScan failed', { error, scanId, workspaceId });
      throw error;
    }
  },

  /**
   * Evaluate a PR scan against quality gate — uses git diff to determine new findings.
   * A finding is "new" if it's on a file and line that was changed in the PR.
   *
   * @param scanId - Scan UUID to evaluate (head branch)
   * @param workspaceId - Workspace UUID for gate config lookup
   * @param repositoryId - Repository UUID for branch diff
   * @param headBranch - PR head branch
   * @param baseBranch - PR base branch
   * @returns Evaluation result with status, gate config, new/fixed finding counts
   */
  async evaluatePrScan(
    scanId: string,
    workspaceId: string,
    repositoryId: string,
    headBranch: string,
    baseBranch: string,
  ) {
    logger.scan.info('evaluatePrScan', { scanId, workspaceId, repositoryId, headBranch, baseBranch });

    try {
      const gate = await this.getConfig(workspaceId);

      // Look up scan record for PR number
      const scan = await scanRepository.getById(scanId);

      // Get SCM credentials for git diff
      let changedFiles: ChangedFile[] = [];
      if (scan?.prNumber && scan?.repositoryId) {
        try {
          const [repo] = await db.select().from(repositories).where(eq(repositories.id, scan.repositoryId)).limit(1);
          const [sc] = await db.select().from(sourceControls).where(eq(sourceControls.workspaceId, workspaceId)).limit(1);

          if (repo && sc?.credentials) {
            const creds = sc.credentials as { baseUrl?: string; token?: string };
            if (creds.baseUrl && creds.token) {
              const scm = createScmApiService(sc.provider || 'gitea', {
                baseUrl: creds.baseUrl, token: creds.token,
                sourceControlId: sc.id,
              });
              const [owner, repoName] = parseRepoName(repo.name);
              changedFiles = await scm.getPrChangedFiles(owner, repoName, scan.prNumber);
            }
          }
        } catch (err) {
          logger.scan.warn('evaluatePrScan: failed to get git diff, falling back to empty', { error: (err as Error).message });
        }
      }

      logger.scan.info('evaluatePrScan: changedFiles from SCM', {
        scanId,
        changedFilesCount: changedFiles.length,
        samplePaths: changedFiles.slice(0, 5).map(f => ({ path: f.filePath, lines: f.changedLines.length })),
      });

      // Get new findings using code diff (findings on changed lines)
      const newFindings = await findingRepository.diffNewFindingsByCodeDiff(scanId, changedFiles);

      logger.scan.info('evaluatePrScan: code diff result', {
        scanId,
        newFindingsCount: newFindings.total,
        changedFilesCount: changedFiles.length,
      });

      // Update finding_group_scans.isNew based on code diff
      await findingRepository.updateIsNewByCodeDiff(scanId, changedFiles);

      // Get fixed findings: compare against previous scan on same branch (if exists)
      let fixedFindingsTotal = 0;
      let fixedFingerprints: string[] = [];
      try {
        const previousScanId = await findingRepository.getPreviousScanId(repositoryId, headBranch, scanId);
        if (previousScanId) {
          fixedFingerprints = await findingRepository.diffFixedFindingsByBranch(
            repositoryId, headBranch, scanId, previousScanId,
          );
          fixedFindingsTotal = fixedFingerprints.length;
        }
      } catch (err) {
        logger.scan.warn('evaluatePrScan: failed to get fixed findings', { error: (err as Error).message });
      }

      const blockingFindings = countBlockingFindings(newFindings.data, gate);
      const openFindings = newFindings.data.filter((f) => (f.groupStatus ?? 'open') === 'open');
      const tpFindings = newFindings.data.filter((f) => f.aiVerdict === 'true_positive');

      let status: 'passed' | 'failed' | 'warning' = 'passed';

      if (gate.failOnCritical && blockingFindings.critical > 0) {
        status = 'failed';
      }
      if (gate.failOnHigh && blockingFindings.high > 0) {
        status = 'failed';
      }
      if (gate.failOnMedium && blockingFindings.medium > 0) {
        status = 'failed';
      }
      if (gate.failOnLow && blockingFindings.low > 0) {
        status = 'failed';
      }

      if (gate.failOnPending && openFindings.length > 0 && status === 'passed') {
        status = 'failed';
      }

      if (gate.failOnTp && tpFindings.length > 0 && status === 'passed') {
        status = 'failed';
      }

      if (status === 'passed' && gate.warnOnPending && openFindings.length > 0) {
        status = 'warning';
      }

      const totalBlocking = blockingFindings.critical + blockingFindings.high + blockingFindings.medium + blockingFindings.low;

      // Compute persistent (pre-existing) findings: total on head - new
      const totalHeadGroups = await findingRepository.countGroupsByBranch(repositoryId, headBranch);
      const persistentFindings = Math.max(0, totalHeadGroups - newFindings.total);

      const result = await qualityGateRepository.createResult({
        scanId,
        gateId: gate.id,
        status,
        blockingFindings: totalBlocking,
        pendingFindings: openFindings.length,
        newFindings: newFindings.total,
        fixedFindings: fixedFindingsTotal,
        persistentFindings,
      });

      const evaluation = {
        status,
        gate: {
          threshold: gate.threshold,
          failOnCritical: gate.failOnCritical,
          failOnHighTp: gate.failOnHighTp,
          failOnHigh: gate.failOnHigh,
          failOnMedium: gate.failOnMedium,
          failOnLow: gate.failOnLow,
          failOnPending: gate.failOnPending,
          failOnTp: gate.failOnTp,
          warnOnPending: gate.warnOnPending,
        },
        findings: {
          total: newFindings.total,
          blocking: totalBlocking,
          pending: openFindings.length,
        },
        pr: {
          newFindings: newFindings.total,
          fixedFindings: fixedFindingsTotal,
          headBranch,
          baseBranch,
        },
        newFindingsData: newFindings.data,
        fixedFindingsData: [],
        fixedFingerprints,
        changedFiles,
        result,
      };

      logger.scan.info('evaluatePrScan completed', { scanId, workspaceId, status, newFindings: newFindings.total, fixedFindings: fixedFindingsTotal, changedFiles: changedFiles.length });

      return evaluation;
    } catch (error) {
      logger.scan.error('evaluatePrScan failed', { error, scanId, workspaceId });
      throw error;
    }
  },

  /**
   * List recent quality gate evaluation results for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @returns Array of gate result records
   */
  async listResults(workspaceId: string) {
    logger.scan.debug('listResults', { workspaceId });

    try {
      const results = await qualityGateRepository.listResults(workspaceId);
      logger.scan.debug('listResults completed', { workspaceId, count: results.length });
      return results;
    } catch (error) {
      logger.scan.error('listResults failed', { error, workspaceId });
      throw error;
    }
  },

  /**
   * Re-post the PR summary comment after QG re-evaluation.
   * Called when verdict changes or AI review completes to keep the PR comment up to date.
   */
  async repostPrComment(scanId: string, workspaceId: string) {
    try {
      const scan = await scanRepository.getById(scanId);
      if (!scan?.prNumber || !scan?.headBranch || !scan?.baseBranch || !scan?.repositoryId) return;

      const [repo] = await db.select().from(repositories).where(eq(repositories.id, scan.repositoryId)).limit(1);
      if (!repo) return;

      const [sc] = await db.select().from(sourceControls).where(eq(sourceControls.workspaceId, workspaceId)).limit(1);
      if (!sc?.credentials) return;

      const creds = sc.credentials as { baseUrl?: string; token?: string; clientId?: string; clientSecret?: string; refreshToken?: string };
      if (!creds.baseUrl || !creds.token) return;

      const scm = createScmApiService(sc.provider || 'gitea', {
        baseUrl: creds.baseUrl, token: creds.token,
        clientId: creds.clientId, clientSecret: creds.clientSecret, refreshToken: creds.refreshToken,
        sourceControlId: sc.id,
      });
      const [owner, repoName] = parseRepoName(repo.name);

      const [ws] = await db.select({ slug: workspaces.slug }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
      const workspaceSlug = ws?.slug ?? 'workspace';

      const gateResult = await this.evaluatePrScan(scanId, workspaceId, scan.repositoryId, scan.headBranch, scan.baseBranch);

      // Reuse newFindingsData from evaluatePrScan (already computed via code diff)
      const diffData = (gateResult as { newFindingsData?: unknown[] }).newFindingsData ?? [];

      logger.scan.info('repostPrComment: diffData from evaluatePrScan', {
        scanId,
        diffDataLength: Array.isArray(diffData) ? diffData.length : 'N/A',
        gateStatus: gateResult.status,
      });

      const newFindings = diffData.map((f) => {
        const rec = f as Record<string, unknown>;
        return {
          severity: (rec.severity as string) ?? 'medium',
          filePath: rec.filePath as string,
          lineNumber: rec.lineNumber as number,
          rule: rec.rule as string,
          message: rec.message as string,
          scanner: rec.scanner as string,
          codeSnippet: rec.codeSnippet as string ?? null,
          aiVerdict: rec.aiVerdict as string ?? null,
          confidence: String(rec.confidence ?? ''),
          findingId: (rec.id ?? rec.findingId) as string,
          fingerprint: rec.fingerprint as string,
        };
      });

      const gateDb = await qualityGateRepository.getResultByScanId(scanId);
      const gateStatus = gateDb?.status ?? gateResult.status;
      const newCount = gateDb?.newFindings ?? gateResult.pr?.newFindings ?? newFindings.length;
      const fixedCount = gateDb?.fixedFindings ?? gateResult.pr?.fixedFindings ?? 0;
      const blockingCount = gateDb?.blockingFindings ?? gateResult.findings.blocking;
      const persistentCount = gateDb?.persistentFindings ?? 0;

      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const commentBody = buildPrComment(scanId, gateStatus, newCount, fixedCount, blockingCount, newFindings, appBaseUrl, persistentCount, workspaceSlug);

      await scm.postOrUpdatePrComment(owner, repoName, scan.prNumber, scanId, commentBody);
      logger.scan.info('repostPrComment: PR comment updated', { scanId, prNumber: scan.prNumber, status: gateStatus });
    } catch (err) {
      logger.scan.warn('repostPrComment failed (non-critical)', { scanId, error: (err as Error).message });
    }
  },
};

/**
 * Count findings that block the gate based on severity threshold.
 *
 * @param findings - Array of finding records with severity
 * @param gate - Quality gate config with threshold setting
 * @counts by severity (critical, high, medium, low)
 */
function countBlockingFindings(
  findings: Array<{ severity: string }>,
  _gate: { threshold: string },
) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof typeof counts]++;
    }
  }
  return counts;
}


