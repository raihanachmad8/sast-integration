import { logger } from '@/server/lib/logger';
import { qualityGateRepository } from '../repositories/quality-gate.repository';
import { findingRepository } from '../repositories/finding.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
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

      const findings = await findingRepository.listByProject(projectId, {
        page: 1,
        perPage: 1000,
      });

      const blockingFindings = countBlockingFindings(findings.data, gate);
      const pendingFindings = countPendingFindings(findings.data);

      let status: 'passed' | 'failed' | 'warning' = 'passed';

      if (gate.failOnCritical && blockingFindings.critical > 0) {
        status = 'failed';
      } else if (gate.failOnHighTp && blockingFindings.high > 0) {
        status = 'failed';
      }

      if (gate.warnOnPending && pendingFindings > 0) {
        if (status === 'passed') {
          status = gate.pendingBehavior === 'fail' ? 'failed' : 'warning';
        }
      }

      const totalBlocking = blockingFindings.critical + blockingFindings.high;

      const result = await qualityGateRepository.createResult({
        scanId,
        gateId: gate.id,
        status,
        blockingFindings: totalBlocking,
        pendingFindings,
      });

      const evaluation = {
        status,
        gate: {
          threshold: gate.threshold,
          failOnCritical: gate.failOnCritical,
          failOnHighTp: gate.failOnHighTp,
          warnOnPending: gate.warnOnPending,
        },
        findings: {
          total: findings.data.length,
          blocking: totalBlocking,
          pending: pendingFindings,
        },
        result,
      };

      logger.scan.info('evaluateScan completed', { scanId, workspaceId, status });
      return evaluation;
    } catch (error) {
      logger.scan.error('evaluateScan failed', { error, scanId, workspaceId });
      throw error;
    }
  },

  /**
   * Evaluate a PR scan against quality gate — only counts NEW findings (not on base branch).
   * This is the SonarQube-like PR analysis flow.
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

      // Get new findings (on head but not on base)
      const newFindings = await findingRepository.diffNewFindings(
        repositoryId,
        headBranch,
        baseBranch,
        {},
        { page: 1, perPage: 1000 },
      );

      // Get fixed findings (on base but not on head)
      const fixedFindings = await findingRepository.diffFixedFindings(
        repositoryId,
        headBranch,
        baseBranch,
        {},
        { page: 1, perPage: 1000 },
      );

      const blockingFindings = countBlockingFindings(newFindings.data, gate);
      const pendingFindings = countPendingFindings(newFindings.data);

      let status: 'passed' | 'failed' | 'warning' = 'passed';

      if (gate.failOnCritical && blockingFindings.critical > 0) {
        status = 'failed';
      } else if (gate.failOnHighTp && blockingFindings.high > 0) {
        status = 'failed';
      }

      if (gate.warnOnPending && pendingFindings > 0) {
        if (status === 'passed') {
          status = gate.pendingBehavior === 'fail' ? 'failed' : 'warning';
        }
      }

      const totalBlocking = blockingFindings.critical + blockingFindings.high;

      const result = await qualityGateRepository.createResult({
        scanId,
        gateId: gate.id,
        status,
        blockingFindings: totalBlocking,
        pendingFindings,
        newFindings: newFindings.total,
        fixedFindings: fixedFindings.total,
      });

      const evaluation = {
        status,
        gate: {
          threshold: gate.threshold,
          failOnCritical: gate.failOnCritical,
          failOnHighTp: gate.failOnHighTp,
          warnOnPending: gate.warnOnPending,
        },
        findings: {
          total: newFindings.data.length,
          blocking: totalBlocking,
          pending: pendingFindings,
        },
        pr: {
          newFindings: newFindings.total,
          fixedFindings: fixedFindings.total,
          headBranch,
          baseBranch,
        },
        result,
      };

      logger.scan.info('evaluatePrScan completed', { scanId, workspaceId, status, newFindings: newFindings.total, fixedFindings: fixedFindings.total });

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
  gate: { threshold: string },
) {
  const thresholdMap: Record<string, string[]> = {
    critical: ['critical'],
    high: ['critical', 'high'],
    medium: ['critical', 'high', 'medium'],
    low: ['critical', 'high', 'medium', 'low'],
  };

  const blockingSeverities = thresholdMap[gate.threshold] || ['critical'];

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (blockingSeverities.includes(f.severity)) {
      counts[f.severity as keyof typeof counts]++;
    }
  }

  return counts;
}

/**
 * Count findings that are pending AI verification.
 *
 * @param findings - Array of finding records with status
 * @returns Number of open/pending findings
 */
function countPendingFindings(findings: Array<{ status: string }>) {
  return findings.filter((f) => f.status === 'open').length;
}
