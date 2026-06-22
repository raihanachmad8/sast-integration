import type { Job } from 'pg-boss';
import { randomUUID } from 'node:crypto';
import { logger } from '@/server/lib/logger';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { parseScanResult } from '@/server/modules/scan/parsers';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { db } from '@/server/db/client';
import { models } from '@drizzle/schema/integrations';
import { repositories } from '@drizzle/schema/source-controls';
import { findingGroupScans } from '@drizzle/schema/findings';
import { eq, asc, and, isNull, sql } from 'drizzle-orm';
import { enqueue } from '@/server/modules/queue/queue.service';
import type { NewFinding } from '@drizzle/schema/findings';

interface ParseScanResultJobData {
  scanId: string;
  fileKey: string;
  scanner: string;
  projectId: string | null;
}

/**
 * Parse scan result queue job — processes scanner output in background.
 * 
 * This job is enqueued after a scanner completes execution. It:
 * 1. Downloads scanner output from storage
 * 2. Parses output using the appropriate parser
 * 3. Enriches findings with code snippets from source context
 * 4. Persists findings with dedup (replaces old active findings)
 * 5. Auto-triggers AI verification for new findings
 * 
 * ## Enrichment Flow
 * 
 * ### 1. Pre-computed Code Contexts
 * If `code-contexts.json` exists (from managed scan):
 * - Uses function-level extraction (brace matching)
 * - Provides full function context around finding
 * 
 * ### 2. Raw Source Fallback
 * If only `source-context.json` exists:
 * - Extracts 5-line window around finding
 * - Provides minimal context for debugging
 * 
 * ### 3. No Context (CI/CD Upload)
 * If neither file exists:
 * - Findings are stored without code snippets
 * - Frontend can fetch source on demand if needed
 * 
 * ## AI Verification
 * 
 * After findings are persisted, the job:
 * - Queries for the first available AI model in the workspace
 * - Enqueues `ai-verify-finding` jobs for each new finding
 * - Uses exponential backoff (30s, 1m, 2m, 5m, 10m) with max 5 retries
 * 
 * ## Deduplication
 * 
 * Findings are deduplicated per scan + scanner combination.
 * When a new parse job runs, it replaces all active findings
 * from the same scanner for that scan. This ensures:
 * - Re-running a scanner updates findings correctly
 * - Different scanners don't interfere with each other
 * 
 * @module queue/jobs/parse-scan-result
 * 
 * @example
 * ```ts
 * // Enqueued by managed-scan.service.ts
 * await enqueue('parse-scan-result', {
 *   scanId: '...',
 *   fileKey: 'scan-id/semgrep-1234567890.json',
 *   scanner: 'semgrep',
 *   projectId: '...',
 * });
 * ```
 */
export async function processParseScanResultJob(job: Job<ParseScanResultJobData>) {
  const { scanId, fileKey, scanner, projectId } = job.data;
  const currentJobId = job.id;
  logger.queue.debug('processParseScanResultJob', { scanId, scanner, fileKey, jobId: currentJobId });

  let enrichedFindings: NewFinding[] = [];

  try {
    // Get scan to extract repositoryId
    const scan = await scanRepository.getById(scanId);
    const repositoryId = scan?.repositoryId ?? null;

    // Record: parsing started
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'parsing',
      description: `Parsing ${scanner} results`,
      timestamp: new Date().toISOString(),
      scanner,
    });

    // Download file content from storage
    const storage = await getStorageDriver();
    const stream = await storage.getStream(fileKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    // Parse scanner output
    const result = parseScanResult(scanner, content, scanId);

    // Enrich findings with code snippets from source context (managed scans only)
    enrichedFindings = await enrichFindingsWithSourceContext(scanId, result.findings, storage);

    // Create findings with dedup (replaces old active findings)
    let createdFindings: Array<{ id: string; groupId: string | null; isNew: boolean }> = [];
    if (enrichedFindings.length > 0) {
      const findingResult = await findingService.replaceFindingsForScanJob(projectId, scanId, enrichedFindings, repositoryId);
      createdFindings = findingResult.findings ?? [];
    }

    // Log new vs pre-existing counts
    const newCount = createdFindings.filter((f) => f.isNew).length;
    const persistentCount = createdFindings.filter((f) => !f.isNew).length;
    logger.queue.info('parse-scan-result: findings breakdown', {
      scanId,
      scanner,
      total: createdFindings.length,
      new: newCount,
      persistent: persistentCount,
    });

    // Auto-trigger AI verification for findings from this scanner
    try {
      // Get workspace from scan -> repository
      const scanData = await scanRepository.getById(scanId);
      const repo = scanData?.repositoryId
        ? await db.select({ workspaceId: repositories.workspaceId })
            .from(repositories)
            .where(and(eq(repositories.id, scanData.repositoryId), isNull(repositories.deletedAt)))
            .limit(1)
        : null;
      const workspaceId = repo?.[0]?.workspaceId;

      if (workspaceId && createdFindings.length > 0) {
        // Get first available model
        const [model] = await db.select().from(models)
          .where(eq(models.workspaceId, workspaceId))
          .orderBy(asc(models.priority))
          .limit(1);

        if (model) {
          // Group findings by groupId and skip groups that already have verification
          const { aiVerificationRepository } = await import('@/server/modules/scan/repositories/ai-verification.repository');
          const groupIds = [...new Set(createdFindings.map((f) => f.groupId).filter(Boolean))] as string[];

          const verifiedGroupIds = new Set<string>();
          for (const groupId of groupIds) {
            const hasVerified = await aiVerificationRepository.hasVerification(groupId);
            if (hasVerified) verifiedGroupIds.add(groupId);
          }

          // Get junction data to filter only NEW findings (isNew=true)
          const junctionData = groupIds.length > 0
            ? await db.select({
                groupId: findingGroupScans.groupId,
                isNew: findingGroupScans.isNew,
              })
                .from(findingGroupScans)
                .where(eq(findingGroupScans.scanId, scanId))
            : [];
          const isNewMap = new Map(junctionData.map(j => [j.groupId, j.isNew]));

          // Filter: only NEW findings that don't have verification yet
          const findingsToVerify = createdFindings.filter((f) => {
            if (!f.id) return false;
            if (!f.groupId) return false;
            if (verifiedGroupIds.has(f.groupId)) return false;
            // Skip pre-existing findings (isNew=false) — don't waste AI quota on them
            if (isNewMap.get(f.groupId) === false) return false;
            return true;
          });

          logger.queue.info('parse-scan-result: enqueuing AI verify', {
            scanId,
            totalFindings: createdFindings.length,
            toVerify: findingsToVerify.length,
            skippedGroups: verifiedGroupIds.size,
            modelId: model.id,
          });

          for (const finding of findingsToVerify) {
            if (!finding.id) {
              logger.queue.warn('parse-scan-result: finding has no id', { finding });
              continue;
            }
            try {
              const jobId = await enqueue('ai-verify-finding', { findingId: finding.id, scanId, modelId: model.id, workspaceId }, {
                retryLimit: 5,
                retryDelay: 30,
              });
              logger.queue.info('parse-scan-result: enqueue success', { findingId: finding.id, jobId });
            } catch (err) {
              logger.queue.error('parse-scan-result: AI verify enqueue failed', { findingId: finding.id, error: err instanceof Error ? err.message : String(err) });
            }
          }
        }
      }
    } catch (err) {
      logger.queue.error('parse-scan-result: AI verification setup failed', { scanId, error: err instanceof Error ? err.message : String(err) });
    }

    // Record scan result
    await scanRepository.createScanResult({
      scanId,
      scanner,
      parsedSummary: result.summary,
    });

    // Record: parsing completed — use createdFindings.length (after dedup), not enrichedFindings.length (raw parser output)
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'parsing',
      description: `${scanner} parsing completed — ${createdFindings.length} findings`,
      timestamp: new Date().toISOString(),
      scanner,
    });
  } catch (err) {
    logger.queue.error('parse-scan-result: job failed', {
      scanId,
      scanner,
      jobId: currentJobId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
    });

    // Record: parsing failed
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'parsing',
      description: `${scanner} parsing failed — ${(err as Error).message?.slice(0, 200)}`,
      timestamp: new Date().toISOString(),
      scanner,
    }).catch((appendErr) => {
      logger.queue.error('parse-scan-result: failed to append failure event', {
        scanId,
        error: appendErr instanceof Error ? appendErr.message : String(appendErr),
      });
    });

    // Re-throw so pg-boss marks the job as failed
    throw err;
  } finally {
    // ALWAYS check if all parse jobs are done — even on failure
    // Pass currentJobId so checkAndCompleteScan excludes it from pending count
    logger.queue.debug('parse-scan-result: finally block executing', { scanId, scanner, jobId: currentJobId });
    await checkAndCompleteScan(scanId, projectId, currentJobId);
  }

  logger.queue.info('processParseScanResultJob completed', { scanId, scanner, findingsCount: enrichedFindings.length, jobId: currentJobId });
}

/**
 * Check if all parse jobs for a scan are done and mark scan completed.
 * Runs on BOTH success and failure to prevent scans stuck in "parsing".
 * Uses atomic tryCompleteScan to prevent race conditions between parallel parse jobs.
 *
 * IMPORTANT: currentJobId must be passed so we exclude the running job from the pending count.
 * pg-boss sets state='active' BEFORE calling the handler, and only sets 'completed' AFTER
 * the handler returns. Without excluding the current job, the last parse job would always
 * see itself as "pending" and never complete the scan.
 */
async function checkAndCompleteScan(scanId: string, projectId: string | null, currentJobId: string) {
  try {
    logger.queue.info('checkAndCompleteScan: starting', { scanId, projectId, currentJobId });

    // Count pending jobs: created OR active (excluding the current job which is still 'active')
    const pendingJobs = await db.execute<{ count: number }>(
      sql`SELECT count(*)::int as count FROM pgboss.job 
          WHERE name = 'parse-scan-result' 
          AND data->>'scanId' = ${scanId}
          AND state IN ('created', 'active')
          AND id != ${currentJobId}`
    );
    const pendingCount = pendingJobs[0]?.count ?? 0;

    // Also get full job state breakdown for diagnostics
    const jobStates = await db.execute<{ state: string; count: number }>(
      sql`SELECT state, count(*)::int as count FROM pgboss.job 
          WHERE name = 'parse-scan-result' 
          AND data->>'scanId' = ${scanId}
          GROUP BY state`
    );

    logger.queue.info('checkAndCompleteScan: pending jobs query result', {
      scanId,
      currentJobId,
      pendingCount,
      jobStates: jobStates.map((r) => `${r.state}:${r.count}`).join(', '),
    });

    if (pendingCount > 0) {
      logger.queue.debug('parse-scan-result: still pending jobs', { scanId, pendingCount, currentJobId });
      return;
    }

    logger.queue.info('parse-scan-result: no pending jobs, attempting to complete scan', { scanId, currentJobId });

    // Atomic: only one parse job wins the race to mark completed
    const completedScan = await scanRepository.tryCompleteScan(scanId);
    if (!completedScan) {
      // Already completed by another parse job, or wrong status
      return;
    }

    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'completed',
      description: 'All parsing completed successfully',
      timestamp: new Date().toISOString(),
    });
    logger.queue.info('parse-scan-result: scan marked completed', { scanId });

    // Evaluate quality gate if projectId exists
    if (projectId) {
      try {
        if (completedScan.repositoryId) {
          const [repo] = await db.select({ workspaceId: repositories.workspaceId })
            .from(repositories)
            .where(and(eq(repositories.id, completedScan.repositoryId), isNull(repositories.deletedAt)))
            .limit(1);

          if (repo?.workspaceId) {
            const { qualityGateService } = await import('@/server/modules/scan/services/quality-gate.service');
            await qualityGateService.evaluateScan(scanId, repo.workspaceId, projectId);
            logger.queue.info('parse-scan-result: quality gate evaluated', { scanId });
          } else {
            logger.queue.warn('parse-scan-result: workspace not found for repository', { scanId, repositoryId: completedScan.repositoryId });
          }
        }
      } catch (err) {
        logger.queue.error('parse-scan-result: quality gate evaluation failed', { scanId, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } catch (err) {
    logger.queue.error('parse-scan-result: failed to check pending jobs', {
      scanId,
      currentJobId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
    });
  }
}

/**
 * Enrich findings with code snippets from source context stored during scan.
 * Uses pre-computed code contexts (function-level extraction) when available,
 * falls back to 5-line window from raw source files.
 */
async function enrichFindingsWithSourceContext(
  scanId: string,
  findings: NewFinding[],
  storage: Awaited<ReturnType<typeof getStorageDriver>>,
): Promise<NewFinding[]> {
  // Try to load pre-computed code contexts (function-level extraction via brace matching)
  let codeContextMap: Record<string, { codeSnippet: string; codeSnippetStartLine: number }> = {};
  try {
    const stream = await storage.getStream(`${scanId}/code-contexts.json`);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    codeContextMap = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    logger.queue.info('enrichFindingsWithSourceContext: pre-computed code contexts loaded', { count: Object.keys(codeContextMap).length });
  } catch {
    // No pre-computed code contexts available
  }

  // Try to load raw source context (fallback for 5-line window)
  let sourceContext: Record<string, string> = {};
  try {
    const stream = await storage.getStream(`${scanId}/source-context.json`);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    sourceContext = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    // No source context available (CI upload or collection failed)
  }

  if (Object.keys(codeContextMap).length === 0 && Object.keys(sourceContext).length === 0) {
    logger.queue.info('enrichFindingsWithSourceContext: no context data available', { scanId });
    return findings;
  }

  logger.queue.info('enrichFindingsWithSourceContext: starting enrichment', {
    scanId,
    findingsCount: findings.length,
    codeContextKeys: Object.keys(codeContextMap).length,
    sourceContextKeys: Object.keys(sourceContext).length,
    sampleSourceKeys: Object.keys(sourceContext).slice(0, 3),
  });

  // Enrich findings with code context
  return findings.map((f) => {
    if (!f.filePath || !f.lineNumber) {
      logger.queue.debug('enrichFindingsWithSourceContext: skipping finding without file/line', {
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        rule: f.rule,
      });
      return f;
    }

    // 1. Try pre-computed code context first (function-level extraction)
    const contextKey = `${f.filePath}:${f.lineNumber}`;
    const preComputed = codeContextMap[contextKey];
    if (preComputed) {
      logger.queue.debug('enrichFindingsWithSourceContext: using pre-computed context', { filePath: f.filePath, line: f.lineNumber });
      return {
        ...f,
        codeSnippet: preComputed.codeSnippet,
      };
    }

    // 2. Fall back to 5-line window from raw source files
    const fileName = f.filePath.replace(/\\/g, '/').split('/').pop() ?? '';
    const sourceContent = sourceContext[f.filePath]
      ?? sourceContext[fileName]
      ?? Object.entries(sourceContext).find(([key]) => key.endsWith('/' + fileName) || key === fileName)?.[1];

    if (!sourceContent) {
      logger.queue.debug('enrichFindingsWithSourceContext: no source content found', {
        filePath: f.filePath,
        fileName,
        sourceContextKeys: Object.keys(sourceContext).slice(0, 5),
      });
      return f;
    }

    const lines = sourceContent.split('\n');
    const lineIdx = f.lineNumber - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) return f;

    const start = Math.max(0, lineIdx - 2);
    const end = Math.min(lines.length - 1, lineIdx + 2);
    const codeSnippet = lines.slice(start, end + 1).join('\n');

    return {
      ...f,
      codeSnippet,
    };
  });
}
