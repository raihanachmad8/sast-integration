/**
 * CI/CD Complete Endpoint
 *
 * POST /api/v1/ci/complete
 *
 * Finalizes a scan from CI/CD pipelines:
 * 1. Updates scan status
 * 2. Posts inline comments (fast feedback)
 * 3. Evaluates quality gate (final verdict)
 * 4. Posts PR comment (final summary)
 * 5. Sets commit status (for branch protection)
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Request Format (JSON)
 * ```json
 * {
 *   "scanId": "uuid",
 *   "status": "completed" | "failed",
 *   "message": "All tools completed",
 *   "totalFindings": 15,
 *   "totalDuration": 45,
 *   "successRate": 4,
 *   "tools": ["cppcheck", "flawfinder", "clang-tidy", "gcc-analyzer"],
 *   "platform": "gitea",
 *   "trigger": "ci"
 * }
 * ```
 *
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "scanId": "uuid",
 *     "status": "completed",
 *     "qualityGate": { "status": "passed", ... },
 *     "prComment": { "action": "created", "prNumber": 2 },
 *     "commitStatus": { "status": "success", "context": "sast-integration/gate" }
 *   }
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { aiVerificationRepository } from '@/server/modules/scan/repositories/ai-verification.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { qualityGateRepository } from '@/server/modules/scan/repositories/quality-gate.repository';
import { createScmApiService, parseRepoName, buildPrComment, buildInlineReviewComment } from '@/server/modules/source-control/scm-api.service';
import type { InlineReviewComment } from '@/server/modules/source-control/scm-api.service';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { enqueue } from '@/server/modules/queue/queue.service';
import { sourceControls } from '@drizzle/schema/source-controls';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { db } from '@/server/db/client';
import { eq } from 'drizzle-orm';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { randomUUID } from 'node:crypto';
import { validateBody } from '@/server/http/validate';
import { ciCompleteSchema } from '@/commons/schemas/ci.schema';

const COMMIT_STATUS_CONTEXT = 'sast-integration/gate';

export async function POST(request: NextRequest) {
  logger.scan.info('post request');

  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = auth.context!;

  try {
    const validation = await validateBody(request, ciCompleteSchema);
    if (!validation.success) return validation.response;
    const {
      scanId,
      status,
      message,
      totalFindings,
      totalDuration,
      successRate,
      tools,
      platform,
      trigger,
    } = validation.data;

    logger.scan.info('CI/CD complete', { scanId, status, totalFindings, tools, platform });

    const scan = await scanRepository.getById(scanId);
    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // IDOR protection: ensure scan belongs to the authenticated workspace
    if (scan.repositoryId) {
      const scanRepository_ = await repositoriesRepository.getById(scan.repositoryId, workspaceId);
      if (!scanRepository_) {
        return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
      }
    }

    // Idempotency: skip if scan already in terminal state
    if (scan.status === 'completed' || scan.status === 'failed') {
      logger.scan.info('CI/CD complete: scan already in terminal state, skipping', { scanId, status: scan.status });
      return ApiResponse.success('Scan already completed', { scanId, status: scan.status, skipped: true });
    }

    // 1. Update scan status (validate it's a terminal status)
    const validStatuses = ['completed', 'failed'];
    const scanStatus = status && validStatuses.includes(status) ? status : 'completed';

    // TODO: Create scanService.completeScan(scanId, status) to handle status update + progress event + result in one call
    await scanRepository.updateStatus(scanId, scanStatus);

    // 2. Append completion event
    // TODO: Create scanService.appendProgressEvent(scanId, event) for CI progress tracking
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'completed',
      description: message || 'CI/CD scan completed',
      timestamp: new Date().toISOString(),
    });

    // 3. Store summary
    // TODO: Create scanService.recordScanResult(scanId, summary) for CI result recording
    await scanRepository.createScanResult({
      scanId,
      scanner: 'ci-cd',
      format: 'json',
      parsedSummary: { totalFindings, totalDuration, successRate, tools, platform, trigger },
    });

    // 4. Evaluate quality gate
    let gateResult = null;
    const hasPrFields = !!(scan.prNumber && scan.baseBranch && scan.headBranch && scan.repositoryId);
    logger.scan.info('CI/CD: evaluating quality gate', {
      scanId,
      hasPrFields,
      prNumber: scan.prNumber,
      hasBaseBranch: !!scan.baseBranch,
      hasHeadBranch: !!scan.headBranch,
      hasRepositoryId: !!scan.repositoryId,
      hasProjectId: !!projectId,
      willCallEvaluatePrScan: hasPrFields,
      willCallEvaluateScan: !hasPrFields && !!projectId,
    });

    if (hasPrFields) {
      gateResult = await qualityGateService.evaluatePrScan(
        scanId, workspaceId, scan.repositoryId!, scan.headBranch!, scan.baseBranch!,
      );
    } else if (projectId) {
      gateResult = await qualityGateService.evaluateScan(scanId, workspaceId, projectId);
    }

    logger.scan.info('CI/CD scan completed', {
      scanId,
      status,
      gateStatus: gateResult?.status,
      hasNewFindingsData: !!(gateResult as { newFindingsData?: unknown[] })?.newFindingsData,
      newFindingsDataLength: Array.isArray((gateResult as { newFindingsData?: unknown[] })?.newFindingsData)
        ? ((gateResult as { newFindingsData?: unknown[] })?.newFindingsData as unknown[]).length
        : 'N/A',
    });

    // 4b. Queue AI verification ONLY for NEW findings (on changed lines)
    if (scan.prNumber && scan.repositoryId && gateResult) {
      try {
        const newFindingsData = (gateResult as { newFindingsData?: Array<{ id?: string; groupId?: string | null }> }).newFindingsData ?? [];
        // TODO: Create aiVerificationService.getPrimaryModel() to wrap repository call
        const model = await aiVerificationRepository.getPrimaryModel();

        if (model && newFindingsData.length > 0) {
          // Skip groups that already have verification
          const groupIds = [...new Set(newFindingsData.map((f) => f.groupId).filter(Boolean))] as string[];
          const verifiedGroupIds = new Set<string>();
          if (groupIds.length > 0) {
            // TODO: Create aiVerificationService.hasVerificationBatch(groupIds) to wrap repository call
            const verifiedGroups = await aiVerificationRepository.hasVerificationBatch(groupIds);
            verifiedGroups.forEach((id) => verifiedGroupIds.add(id));
          }

          const toVerify = newFindingsData.filter((f) => {
            if (!f.id) return false;
            if (!f.groupId) return true;
            return !verifiedGroupIds.has(f.groupId);
          });

          for (const finding of toVerify) {
            if (!finding.id) continue;
            await enqueue('ai-verify-finding', {
              findingId: finding.id,
              scanId,
              modelId: model.id,
              workspaceId,
            }, { retryLimit: 5, retryDelay: 30 });
          }

          logger.scan.info('CI/CD complete: AI verification enqueued', {
            scanId,
            totalNew: newFindingsData.length,
            toVerify: toVerify.length,
            skippedGroups: verifiedGroupIds.size,
          });
        }
      } catch (err) {
        logger.scan.error('CI/CD complete: AI verification enqueue failed (non-critical)', { scanId, error: (err as Error).message });
      }
    }

    // 5. Post inline comments FIRST (fast feedback to developer)
    let inlineCommentsResult = null;
    if (scan.prNumber && scan.headBranch && scan.baseBranch && scan.repositoryId) {
      try {
        inlineCommentsResult = await postInlineComments(scanId, workspaceId, scan, gateResult);
      } catch (err) {
        logger.scan.error('CI/CD inline comments failed (non-critical)', { scanId, error: (err as Error).message });
      }
    }

    // 6. Evaluate quality gate (final verdict — after inline comments posted)
    // gateResult already computed in step 4 above, no need to re-evaluate

    // 7. Post PR comment + commit status (final summary with QG data)
    let prCommentResult = null;
    let commitStatusResult = null;
    if (scan.prNumber && scan.headBranch && scan.baseBranch && scan.repositoryId) {
      try {
        const scmResult = await postPrCommentAndCommitStatus(
          scanId, workspaceId, scan, gateResult,
        );
        prCommentResult = scmResult.prComment;
        commitStatusResult = scmResult.commitStatus;
      } catch (err) {
        logger.scan.error('CI/CD SCM actions failed (non-critical)', { scanId, error: (err as Error).message });
      }
    }

    return ApiResponse.success('Scan completed', {
      scanId,
      status,
      qualityGate: gateResult ? {
        status: gateResult.status,
        newFindings: (gateResult as { pr?: { newFindings?: number } }).pr?.newFindings ?? 0,
        fixedFindings: (gateResult as { pr?: { fixedFindings?: number } }).pr?.fixedFindings ?? 0,
        persistentFindings: (gateResult as { result?: { persistentFindings?: number } }).result?.persistentFindings ?? 0,
        blockingFindings: gateResult.findings.blocking,
        pendingFindings: gateResult.findings.pending,
      } : null,
      prComment: prCommentResult,
      inlineComments: inlineCommentsResult,
      commitStatus: commitStatusResult,
    });
  } catch (error) {
    logger.scan.error('CI/CD complete failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to complete scan', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * Post inline review comments for new findings (fast feedback).
 */
async function postInlineComments(
  scanId: string,
  workspaceId: string,
  scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null; prNumber: number | null },
  gateResult: { status: string; newFindings?: number; fixedFindings?: number; blockingFindings?: number } | null,
): Promise<{ created: number; updated: number } | null> {
  if (!scan.repositoryId || !scan.headBranch || !scan.baseBranch || !scan.prNumber) return null;

  const repository = await repositoriesRepository.getById(scan.repositoryId, workspaceId);
  if (!repository) return null;

  // TODO: Create sourceControlService.getCredentialsWithProvider(workspaceId) that returns full credentials + provider
  const [sourceControl] = await db
    .select()
    .from(sourceControls)
    .where(eq(sourceControls.workspaceId, workspaceId))
    .limit(1);

  if (!sourceControl?.credentials) return null;

  const credentials = sourceControl.credentials as { baseUrl?: string; token?: string; provider?: string; clientId?: string; clientSecret?: string; refreshToken?: string };
  if (!credentials.baseUrl || !credentials.token) return null;

  const provider = sourceControl.provider || 'gitea';
  const scm = createScmApiService(provider, {
    baseUrl: credentials.baseUrl,
    token: credentials.token,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
    sourceControlId: sourceControl.id,
  });
  const [owner, repo] = parseRepoName(repository.name);

  // Use workspaceRepository instead of raw DB query
  const ws = await workspaceRepository.findById(workspaceId);
  const workspaceSlug = ws?.slug ?? 'workspace';

  // Get new findings from code diff
  const precomputedFindings = (gateResult as { newFindingsData?: unknown[] })?.newFindingsData;
  const diffData = precomputedFindings !== undefined && precomputedFindings !== null
    ? precomputedFindings
    : (await findingRepository.diffNewFindings(
        scan.repositoryId!, scan.headBranch!, scan.baseBranch!, {}, { page: 1, perPage: 1000 },
      )).data;

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

  // Dedup by fingerprint
  const seenFingerprints = new Set<string>();
  const uniqueFindings = newFindings.filter((f) => {
    if (!f.filePath || !f.lineNumber || !f.findingId || !f.fingerprint) return false;
    if (seenFingerprints.has(f.fingerprint)) return false;
    seenFingerprints.add(f.fingerprint);
    return true;
  });

  // Resolve fixed finding threads
  try {
    const fixedFingerprints = (gateResult as { fixedFingerprints?: string[] })?.fixedFingerprints;
    if (fixedFingerprints && fixedFingerprints.length > 0) {
      const resolveResult = await scm.resolveInlineReviewComments(owner, repo, scan.prNumber, fixedFingerprints);
      logger.scan.info('CI/CD: resolved finding threads', { scanId, resolved: resolveResult.resolved, failed: resolveResult.failed });
    }
  } catch (err) {
    logger.scan.warn('CI/CD: resolve threads failed (non-critical)', { scanId, error: (err as Error).message });
  }

  // Post new inline comments (skip existing)
  if (uniqueFindings.length === 0) return { created: 0, updated: 0 };

  // TODO: Create findingsService.getExistingFingerprints(owner, repo, prNumber) to wrap SCM call
  const existingFingerprints = await scm.listExistingInlineFingerprints(owner, repo, scan.prNumber);
  const newOnlyFindings = uniqueFindings.filter((f) => !existingFingerprints.has(f.fingerprint));

  if (newOnlyFindings.length === 0) {
    logger.scan.info('CI/CD: all inline findings already have comments, skipping', { scanId });
    return { created: 0, updated: 0 };
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inlineComments: InlineReviewComment[] = newOnlyFindings.map((f) => ({
    filePath: f.filePath!,
    lineNumber: f.lineNumber!,
    body: buildInlineReviewComment(f, appBaseUrl, workspaceSlug),
    severity: f.severity,
    findingId: f.findingId,
    fingerprint: f.fingerprint,
    scanner: f.scanner,
  }));

  return await scm.postInlineReviewComments(owner, repo, scan.prNumber, scanId, inlineComments);
}

/**
 * Post PR summary comment and set commit status (final step — after inline comments).
 */
async function postPrCommentAndCommitStatus(
  scanId: string,
  workspaceId: string,
  scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null; prNumber: number | null; commitSha: string | null },
  gateResult: { status: string; newFindings?: number; fixedFindings?: number; blockingFindings?: number } | null,
): Promise<{
  prComment: { action: 'created' | 'updated'; prNumber: number } | null;
  commitStatus: { status: string; context: string } | null;
}> {
  if (!scan.repositoryId || !scan.headBranch || !scan.baseBranch || !scan.prNumber) {
    return { prComment: null, commitStatus: null };
  }

  const repository = await repositoriesRepository.getById(scan.repositoryId, workspaceId);
  if (!repository) return { prComment: null, commitStatus: null };

  // TODO: Create sourceControlService.getCredentialsWithProvider(workspaceId) that returns full credentials + provider
  const [sourceControl] = await db
    .select()
    .from(sourceControls)
    .where(eq(sourceControls.workspaceId, workspaceId))
    .limit(1);

  if (!sourceControl?.credentials) return { prComment: null, commitStatus: null };

  const credentials = sourceControl.credentials as { baseUrl?: string; token?: string; provider?: string; clientId?: string; clientSecret?: string; refreshToken?: string };
  if (!credentials.baseUrl || !credentials.token) return { prComment: null, commitStatus: null };

  const provider = sourceControl.provider || 'gitea';
  const scm = createScmApiService(provider, {
    baseUrl: credentials.baseUrl,
    token: credentials.token,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
    sourceControlId: sourceControl.id,
  });
  const [owner, repo] = parseRepoName(repository.name);

  // Use workspaceRepository instead of raw DB query
  const ws = await workspaceRepository.findById(workspaceId);
  const workspaceSlug = ws?.slug ?? 'workspace';

  // Post PR summary comment
  let prCommentResult = null;
  try {
    // TODO: Create qualityGateService.getResultByScanId(scanId) to wrap repository call
    const gateDb = await qualityGateRepository.getResultByScanId(scanId);
    const gateStatus = gateDb?.status ?? gateResult?.status ?? 'pending';
    const newCount = gateDb?.newFindings ?? gateResult?.newFindings ?? 0;
    const fixedCount = gateDb?.fixedFindings ?? gateResult?.fixedFindings ?? 0;
    const blockingCount = gateDb?.blockingFindings ?? gateResult?.blockingFindings ?? 0;
    const persistentCount = gateDb?.persistentFindings ?? 0;

    // Get dismissed/resolved counts
    // TODO: Create findingsService.countGroupsByStatusForScan(scanId) to wrap repository call
    const statusCounts = await findingRepository.countGroupsByStatusForScan(scanId);
    const dismissedCount = statusCounts.dismissed;
    const resolvedCount = statusCounts.resolved;

    // Get new findings for the comment body
    // TODO: Create findingsService.diffNewFindingsForPr(repositoryId, headBranch, baseBranch) to wrap repository call
    const precomputedFindings = (gateResult as { newFindingsData?: unknown[] })?.newFindingsData;
    const diffData = precomputedFindings !== undefined && precomputedFindings !== null
      ? precomputedFindings
      : (await findingRepository.diffNewFindings(
          scan.repositoryId!, scan.headBranch!, scan.baseBranch!, {}, { page: 1, perPage: 1000 },
        )).data;

    const newFindingsForComment = diffData.map((f) => {
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

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const commentBody = buildPrComment(
      scanId, gateStatus, newCount, fixedCount, blockingCount, newFindingsForComment, appBaseUrl, persistentCount, workspaceSlug, dismissedCount, resolvedCount,
    );

    const action = await scm.postOrUpdatePrComment(owner, repo, scan.prNumber, scanId, commentBody);
    prCommentResult = { action, prNumber: scan.prNumber };
  } catch (err) {
    logger.scan.error('PR comment failed', { scanId, error: (err as Error).message });
  }

  // Set commit status
  let commitStatusResult = null;
  if (scan.commitSha) {
    try {
      const gateStatus = gateResult?.status ?? 'pending';
      const commitStatus = gateStatus === 'passed' ? 'success' : gateStatus === 'failed' ? 'failure' : 'pending';
      const description = gateStatus === 'passed' ? 'SAST quality gate passed' : `SAST quality gate ${gateStatus}`;
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const targetUrl = `${appBaseUrl}/workspace/scan/${scanId}`;

      await scm.createCommitStatus(owner, repo, scan.commitSha, {
        status: commitStatus,
        description,
        context: COMMIT_STATUS_CONTEXT,
        targetUrl,
      });
      commitStatusResult = { status: commitStatus, context: COMMIT_STATUS_CONTEXT };
    } catch (err) {
      logger.scan.error('Commit status failed', { scanId, error: (err as Error).message });
    }
  }

  return { prComment: prCommentResult, commitStatus: commitStatusResult };
}
