import type { Job } from 'pg-boss';
import { randomUUID } from 'node:crypto';
import { logger } from '@/server/lib/logger';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { parseScanResult } from '@/server/modules/scan/parsers';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
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
  logger.queue.debug('processParseScanResultJob', { scanId, scanner, fileKey });

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
  const enrichedFindings = await enrichFindingsWithSourceContext(scanId, result.findings, storage);

  // Create findings with dedup (replaces old active findings)
  let createdFindings: Array<{ id: string }> = [];
  if (enrichedFindings.length > 0) {
    const result = await findingService.replaceFindingsForScanJob(projectId, scanId, enrichedFindings, repositoryId);
    createdFindings = result.findings ?? [];
  }

  // Auto-trigger AI verification for findings from this scanner
  try {
    const { db } = await import('@/server/db/client');
    const { models } = await import('@drizzle/schema/integrations');
    const { eq: drizzleEq, asc, and: drizzleAnd, isNull: drizzleIsNull } = await import('drizzle-orm');
    const { repositories } = await import('@drizzle/schema/source-controls');

    // Get workspace from scan -> repository
    const scan = await scanRepository.getById(scanId);
    const repo = scan?.repositoryId ? await db.select({ workspaceId: repositories.workspaceId }).from(repositories).where(drizzleAnd(drizzleEq(repositories.id, scan.repositoryId), drizzleIsNull(repositories.deletedAt))).limit(1) : null;
    const workspaceId = repo?.[0]?.workspaceId;

    if (workspaceId) {
      // Get first available model
      const [model] = await db.select().from(models)
        .where(drizzleEq(models.workspaceId, workspaceId))
        .orderBy(asc(models.priority))
        .limit(1);

      if (model && createdFindings.length > 0) {
        logger.queue.info('parse-scan-result: about to enqueue AI verify', { scanId, count: createdFindings.length, modelId: model.id });
        for (const finding of createdFindings) {
          if (!finding.id) {
            logger.queue.warn('parse-scan-result: finding has no id', { finding });
            continue;
          }
          try {
            const { enqueue } = await import('@/server/modules/queue/queue.service');
            const jobId = await enqueue('ai-verify-finding', { findingId: finding.id, scanId, modelId: model.id }, {
              retryLimit: 5,
              retryDelay: 30,
            });
            logger.queue.info('parse-scan-result: enqueue success', { findingId: finding.id, jobId });
          } catch (err) {
            logger.queue.error('parse-scan-result: AI verify enqueue failed', { findingId: finding.id, error: err instanceof Error ? err.message : String(err) });
          }
        }
        logger.queue.info('parse-scan-result: AI verification enqueued', { scanId, count: createdFindings.length, modelId: model.id });
      } else {
        logger.queue.info('parse-scan-result: skipping AI verify', { scanId, modelFound: !!model, findingsCount: createdFindings.length });
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

  // Record: parsing completed
  await scanRepository.appendProgressEvent(scanId, {
    id: randomUUID(),
    type: 'parsing',
    description: `${scanner} parsing completed — ${enrichedFindings.length} findings`,
    timestamp: new Date().toISOString(),
    scanner,
  });

  // Check if all parse jobs for this scan are done — if so, mark scan completed
  try {
    const { db } = await import('@/server/db/client');
    const { sql } = await import('drizzle-orm');
    const pendingJobs = await db.execute(
      sql`SELECT count(*)::int as count FROM pgboss.job 
          WHERE name = 'parse-scan-result' 
          AND data->>'scanId' = ${scanId}
          AND state IN ('created', 'active')`
    );
    const pendingCount = pendingJobs[0]?.count ?? 0;

    if (pendingCount === 0) {
      await scanRepository.updateStatus(scanId, 'completed');
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
          const scan = await scanRepository.getById(scanId);
          if (scan?.repositoryId) {
            // Look up workspaceId from repository
            const { db: dbClient } = await import('@/server/db/client');
            const { repositories } = await import('@drizzle/schema/source-controls');
            const { eq: drizzleEq, and: drizzleAnd, isNull: drizzleIsNull } = await import('drizzle-orm');
            const [repo] = await dbClient.select({ workspaceId: repositories.workspaceId })
              .from(repositories)
              .where(drizzleAnd(drizzleEq(repositories.id, scan.repositoryId), drizzleIsNull(repositories.deletedAt)))
              .limit(1);

            if (repo?.workspaceId) {
              const { qualityGateService } = await import('@/server/modules/scan/services/quality-gate.service');
              await qualityGateService.evaluateScan(scanId, repo.workspaceId, projectId);
              logger.queue.info('parse-scan-result: quality gate evaluated', { scanId });
            } else {
              logger.queue.warn('parse-scan-result: workspace not found for repository', { scanId, repositoryId: scan.repositoryId });
            }
          }
        } catch (err) {
          logger.queue.error('parse-scan-result: quality gate evaluation failed', { scanId, error: err instanceof Error ? err.message : String(err) });
        }
      }
    } else {
      logger.queue.debug('parse-scan-result: still pending jobs', { scanId, pendingCount });
    }
  } catch (err) {
    logger.queue.error('parse-scan-result: failed to check pending jobs', { scanId, error: err instanceof Error ? err.message : String(err) });
  }

  logger.queue.debug('processParseScanResultJob completed', { scanId, findingsCount: enrichedFindings.length });
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
