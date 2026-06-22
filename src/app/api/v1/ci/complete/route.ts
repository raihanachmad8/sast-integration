/**
 * CI/CD Complete Endpoint
 *
 * POST /api/v1/ci/complete
 *
 * Finalizes a scan from CI/CD pipelines:
 * 1. Updates scan status
 * 2. Evaluates quality gate
 * 3. Auto-posts PR comment (dedup by scan ID)
 * 4. Sets commit status (for branch protection)
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
import { workspaces } from '@drizzle/schema/workspaces';
import { db } from '@/server/db/client';
import { eq } from 'drizzle-orm';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { randomUUID } from 'node:crypto';
import { validateBody } from '@/server/http/validate';
import { ciCompleteSchema } from '@/commons/schemas/ci.schema';

const COMMIT_STATUS_CONTEXT = 'sast-integration/gate';

export async function POST(request: NextRequest) {
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

    // Idempotency: skip if scan already in terminal state
    if (scan.status === 'completed' || scan.status === 'failed') {
      logger.scan.info('CI/CD complete: scan already in terminal state, skipping', { scanId, status: scan.status });
      return ApiResponse.success('Scan already completed', { scanId, status: scan.status, skipped: true });
    }

    // 1. Update scan status (validate it's a terminal status)
    const validStatuses = ['completed', 'failed'];
    const scanStatus = status && validStatuses.includes(status) ? status : 'completed';

    await scanRepository.updateStatus(scanId, scanStatus);

    // 2. Append completion event
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'completed',
      description: message || 'CI/CD scan completed',
      timestamp: new Date().toISOString(),
    });

    // 3. Store summary
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
        const model = await aiVerificationRepository.getPrimaryModel();

        if (model && newFindingsData.length > 0) {
          // Skip groups that already have verification
          const groupIds = [...new Set(newFindingsData.map((f) => f.groupId).filter(Boolean))] as string[];
          const verifiedGroupIds = new Set<string>();
          if (groupIds.length > 0) {
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

    // 5. Auto-post PR comment + commit status (if PR scan)
    let prCommentResult = null;
    let commitStatusResult = null;
    let inlineCommentsResult = null;

    if (scan.prNumber && scan.headBranch && scan.baseBranch && scan.repositoryId) {
      try {
        const precomputedData = (gateResult as { newFindingsData?: unknown[] })?.newFindingsData;
        logger.scan.info('CI/CD: calling postPrCommentAndCommitStatus', {
          scanId,
          hasPrecomputedData: precomputedData !== undefined && precomputedData !== null,
          precomputedDataLength: Array.isArray(precomputedData) ? precomputedData.length : 'N/A',
        });

        const scmResult = await postPrCommentAndCommitStatus(
          scanId, workspaceId, scan, gateResult,
          precomputedData,
        );
        prCommentResult = scmResult.prComment;
        commitStatusResult = scmResult.commitStatus;
        inlineCommentsResult = scmResult.inlineComments;
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
 * Post PR comment and set commit status for a completed scan.
 */
async function postPrCommentAndCommitStatus(
  scanId: string,
  workspaceId: string,
  scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null; prNumber: number | null; commitSha: string | null },
  gateResult: { status: string; newFindings?: number; fixedFindings?: number; blockingFindings?: number } | null,
  precomputedFindings?: unknown[],
): Promise<{
  prComment: { action: 'created' | 'updated'; prNumber: number } | null;
  commitStatus: { status: string; context: string } | null;
  inlineComments: { created: number; updated: number } | null;
}> {
  if (!scan.repositoryId || !scan.headBranch || !scan.baseBranch || !scan.prNumber) {
    return { prComment: null, commitStatus: null, inlineComments: null };
  }

  // Get repository and source control credentials
  const repository = await repositoriesRepository.getById(scan.repositoryId, workspaceId);
  if (!repository) return { prComment: null, commitStatus: null, inlineComments: null };

  const [sourceControl] = await db
    .select()
    .from(sourceControls)
    .where(eq(sourceControls.workspaceId, workspaceId))
    .limit(1);

  if (!sourceControl?.credentials) return { prComment: null, commitStatus: null, inlineComments: null };

  const credentials = sourceControl.credentials as { baseUrl?: string; token?: string; provider?: string; clientId?: string; clientSecret?: string; refreshToken?: string };
  if (!credentials.baseUrl || !credentials.token) return { prComment: null, commitStatus: null, inlineComments: null };

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

  // Get workspace slug for PR comment link
  const [ws] = await db.select({ slug: workspaces.slug }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const workspaceSlug = ws?.slug ?? 'workspace';

  // Post PR comment
  let prCommentResult = null;
  let inlineCommentsResult = null;
  try {
    // Use precomputed findings from quality gate, or fallback to fresh query
    const isPrecomputed = precomputedFindings !== undefined && precomputedFindings !== null;
    logger.scan.info('CI/CD: postPrComment precomputed check', {
      scanId,
      isPrecomputed,
      precomputedType: typeof precomputedFindings,
      precomputedLength: Array.isArray(precomputedFindings) ? precomputedFindings.length : 'N/A',
      willUseFallback: !isPrecomputed,
    });

    const diffData = isPrecomputed
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

    // Dedup by fingerprint — each unique finding = 1 inline comment
    const seenFingerprints = new Set<string>();
    const uniqueFindings = newFindings.filter((f) => {
      if (!f.filePath || !f.lineNumber || !f.findingId || !f.fingerprint) return false;
      if (seenFingerprints.has(f.fingerprint)) return false;
      seenFingerprints.add(f.fingerprint);
      return true;
    });

    logger.scan.info('CI/CD: inline findings dedup', {
      total: newFindings.length,
      unique: uniqueFindings.length,
      locations: Array.from(seenFingerprints),
    });

    const gateDb = await qualityGateRepository.getResultByScanId(scanId);
    const gateStatus = gateDb?.status ?? gateResult?.status ?? 'pending';
    const newCount = gateDb?.newFindings ?? gateResult?.newFindings ?? newFindings.length;
    const fixedCount = gateDb?.fixedFindings ?? gateResult?.fixedFindings ?? 0;
    const blockingCount = gateDb?.blockingFindings ?? gateResult?.blockingFindings ?? 0;
    const persistentCount = gateDb?.persistentFindings ?? 0;

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const commentBody = buildPrComment(
      scanId, gateStatus, newCount, fixedCount, blockingCount, newFindings, appBaseUrl, persistentCount, workspaceSlug,
    );

    const action = await scm.postOrUpdatePrComment(owner, repo, scan.prNumber, scanId, commentBody);
    prCommentResult = { action, prNumber: scan.prNumber };

    // Post inline review comments for ALL new findings
    const inlineFindings = uniqueFindings;

    // Resolve inline comments for resolved findings (close/resolve threads)
    try {
      // Use fixedFingerprints from branch comparison (previous scan vs current scan)
      const fixedFingerprints = (gateResult as { fixedFingerprints?: string[] })?.fixedFingerprints;

      if (fixedFingerprints && fixedFingerprints.length > 0) {
        const resolveResult = await scm.resolveInlineReviewComments(
          owner, repo, scan.prNumber, fixedFingerprints,
        );
        logger.scan.info('CI/CD: resolved finding threads', {
          scanId, resolved: resolveResult.resolved, failed: resolveResult.failed,
        });
      }
    } catch (err) {
      logger.scan.warn('CI/CD: resolve threads failed (non-critical)', { scanId, error: (err as Error).message });
    }

    // Post new inline comments (skip findings that already have comments)
    if (inlineFindings.length > 0) {
      const existingFingerprints = await scm.listExistingInlineFingerprints(owner, repo, scan.prNumber);

      const newOnlyFindings = inlineFindings.filter((f) => !existingFingerprints.has(f.fingerprint));

      if (newOnlyFindings.length > 0) {
        const inlineComments: InlineReviewComment[] = newOnlyFindings.map((f) => ({
          filePath: f.filePath!,
          lineNumber: f.lineNumber!,
          body: buildInlineReviewComment(f, appBaseUrl, workspaceSlug),
          severity: f.severity,
          findingId: f.findingId,
          fingerprint: f.fingerprint,
          scanner: f.scanner,
        }));

        inlineCommentsResult = await scm.postInlineReviewComments(
          owner, repo, scan.prNumber, scanId, inlineComments,
        );
      } else {
        inlineCommentsResult = { created: 0, updated: 0 };
        logger.scan.info('CI/CD: all inline findings already have comments, skipping', { scanId });
      }
    }
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

  return { prComment: prCommentResult, commitStatus: commitStatusResult, inlineComments: inlineCommentsResult };
}
