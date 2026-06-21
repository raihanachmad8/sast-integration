import { mkdtemp, rm, readFile, readdir as readdirFs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';
import { schedules } from '@drizzle/schema/scans';
import { logger } from '@/server/lib/logger';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanRepository } from '../repositories/scan.repository';
import { AppError } from '@/server/http/errors';
import {
  QUEUE_JOB_NAMES,
  SCAN_ORIGINS,
  SCAN,
  DEFAULT_MANAGED_SCAN_BRANCH,
  DEFAULT_MANAGED_SCAN_CRON,
  DEFAULT_SCANNERS,
  MAX_SCANNER_OUTPUT_BUFFER_BYTES,
  type ScannerId,
} from '../constants';
import { hasScmConnection } from '@/server/modules/project/constants';
import { SCANNER_COMMANDS, DEFAULT_SCANNER_TIMEOUT_SECONDS } from '../scanners';
import { checkScannerAvailability } from '../scanner-availability';
import { enqueue } from '@/server/modules/queue/queue.service';
import { getStorageDriver } from '@/server/modules/storage/storage.service';

/**
 * Managed scan service — orchestrates the end-to-end scan lifecycle.
 * 
 * This service handles:
 * - Triggering manual scans from the UI
 * - Processing scheduled scans
 * - Cloning repositories and running scanners
 * - Collecting source context and code snippets
 * - Enqueuing parse jobs for background processing
 * 
 * ## Scan Flow
 * 
 * ### 1. Trigger (Manual/Scheduled)
 * ```
 * triggerManualScan() → create scan record → enqueue RUN_MANAGED_SCAN job
 * ```
 * 
 * ### 2. Process Job
 * ```
 * processManagedScanJob()
 *   → clone repository (shallow clone)
 *   → run each scanner sequentially
 *   → collect source context (files + code snippets)
 *   → upload source-context.json and code-contexts.json
 *   → enqueue parse-scan-result jobs (AFTER context is stored)
 *   → mark scan as completed
 * ```
 * 
 * ### 3. Parse Results
 * ```
 * processParseScanResultJob()
 *   → download scanner output from storage
 *   → parse output (SARIF/text/XML/JSON)
 *   → enrich findings with code snippets
 *   → persist findings with dedup
 *   → auto-trigger AI verification
 * ```
 * 
 * ## Scanner Execution
 * 
 * Each scanner is executed with:
 * - Platform-aware configuration (env vars, flags)
 * - Timeout handling (default 300s)
 * - Output capture (stdout/stderr/file)
 * - Error handling (non-zero exit codes)
 * 
 * Text-based scanners (clang-tidy, gcc-fanalyzer) output to stderr and
 * may exit with non-zero codes. Their output is captured regardless.
 * 
 * ## Source Context Collection
 * 
 * After all scanners complete, the service:
 * 1. Extracts finding locations from scanner outputs
 * 2. Resolves code contexts (function-level extraction via brace matching)
 * 3. Collects raw source files for fallback snippets
 * 4. Uploads both to storage for parse job enrichment
 * 
 * @module scan/services/managed-scan
 * 
 * @example
 * ```ts
 * import { managedScanService } from './managed-scan.service';
 * 
 * // Trigger manual scan
 * const result = await managedScanService.triggerManualScan({
 *   workspaceId: '...',
 *   repositoryId: '...',
 *   userId: '...',
 *   scanners: ['semgrep', 'gitleaks'],
 * });
 * // result: { scanId, jobId, status, branch, scanners }
 * ```
 */

export interface TriggerManagedScanInput {
  workspaceId: string;
  projectId?: string | null;
  repositoryId: string;
  userId: string;
  branch?: string;
  scanners?: ScannerId[];
  triggerSource?: 'manual' | 'schedule' | 'webhook';
}

export interface ManagedScanJobData {
  scanId: string;
  projectId: string | null;
  repositoryId: string;
  repositoryUrl: string;
  branch: string;
  scanners: ScannerId[];
  timeoutSeconds: number;
  requestedBy: string;
}

export interface ScheduledManagedScanJobData {
  workspaceId: string;
  projectId: string | null;
  repositoryId: string;
  userId: string;
  branch?: string;
}

export interface ScannerExecutionResult {
  scanner: ScannerId;
  status: 'completed' | 'failed' | 'skipped';
  error?: string;
  fileKey?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const execFileAsync = promisify(execFile);

function normalizeScanners(value: unknown): ScannerId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((scanner): scanner is ScannerId => scanner in SCANNER_COMMANDS);
}

async function checkoutRepository(url: string, branch: string, targetDir: string, timeoutSeconds: number) {
  await execFileAsync('git', ['clone', '--depth', '1', '--branch', branch, url, targetDir], {
    timeout: timeoutSeconds * 1000,
    windowsHide: true,
  });
}

// ─── Scanner Output → Finding Locations ─────────────────────────────────────

type FindingLocation = { filePath: string; lineNumber: number };

function extractFindingLocations(scanner: ScannerId, rawOutput: string): FindingLocation[] {
  const locations: FindingLocation[] = [];
  const config = SCANNER_COMMANDS[scanner];

  if (scanner === 'cppcheck' && config.format === 'xml') {
    // Match: <location file="..." line="..." .../>
    const locationRegex = /<location\s+[^>]*file="([^"]+)"[^>]*line="(\d+)"[^>]*\/>/g;
    for (const m of rawOutput.matchAll(locationRegex)) {
      if (m[1] && m[2]) locations.push({ filePath: m[1], lineNumber: parseInt(m[2], 10) });
    }
  } else if (scanner === 'semgrep' && config.format === 'json') {
    try {
      const parsed = JSON.parse(rawOutput);
      if (Array.isArray(parsed.results)) {
        for (const r of parsed.results) {
          if (r.path && r.start?.line) locations.push({ filePath: r.path, lineNumber: r.start.line });
        }
      }
    } catch { /* skip parse error */ }
  } else if (scanner === 'gitleaks' && config.format === 'json') {
    try {
      const parsed = JSON.parse(rawOutput);
      if (Array.isArray(parsed)) {
        for (const r of parsed) {
          if (r.StartLine && r.File) locations.push({ filePath: r.File, lineNumber: r.StartLine });
        }
      }
    } catch { /* skip parse error */ }
  } else if (scanner === 'flawfinder') {
    // Flawfinder text format: "C:\path\file.c:9:5:  [4] (buffer) strcpy:"
    // Must match filepath:line:col: before the [level] part
    for (const line of rawOutput.split('\n')) {
      const m = line.match(/^(.+?):(\d+):\d+:\s*\[\d+\]\s*\(/);
      if (m?.[1] && m?.[2]) locations.push({ filePath: m[1], lineNumber: parseInt(m[2], 10) });
    }
  } else if (scanner === 'clang-tidy' || scanner === 'gcc-fanalyzer') {
    // Text format: "/path/file.c:42:12: warning: message [check-name]"
    for (const line of rawOutput.split('\n')) {
      const m = line.match(/^(.+?):(\d+):\d+:\s+(?:warning|error):\s+/);
      if (m?.[1] && m?.[2]) {
        const file = m[1];
        // Skip system headers
        if (!file.includes('include') && !file.includes('<')) {
          locations.push({ filePath: file, lineNumber: parseInt(m[2], 10) });
        }
      }
    }
  }

  return locations;
}

// ─── Source Context Collection ───────────────────────────────────────────────

const SOURCE_FILE_PATTERN = /\.(c|cpp|h|hpp|js|ts|jsx|tsx|py|java|go|rs|rb|php|cs|swift|kt)$/;

async function collectSourceFiles(dir: string, relativePath = ''): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  async function walk(currentDir: string, relPath: string) {
    try {
      const entries = await readdirFs(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          if (entry.name === '.git' || entry.name === 'node_modules') continue;
          await walk(fullPath, entryRelPath);
        } else if (SOURCE_FILE_PATTERN.test(entry.name)) {
          try {
            const content = await readFile(fullPath, 'utf-8');
            result.set(entryRelPath, content);
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* skip unreadable dir */ }
  }

  await walk(dir, relativePath);
  return result;
}

// ─── Find Scanner Output File ───────────────────────────────────────────────

async function findScannerOutputFile(checkoutDir: string, scanner: ScannerId): Promise<string | null> {
  const config = SCANNER_COMMANDS[scanner];

  // If scanner writes to a specific output file, try that first
  if (config.outputStream) {
    const streamPath = path.join(checkoutDir, config.outputStream);
    try {
      await readFile(streamPath, 'utf-8');
      return streamPath;
    } catch { /* file doesn't exist, try pattern match */ }
  }

  // Find by scanner name + format pattern
  const files = await readdirFs(checkoutDir);
  const match = files.find(f => f.startsWith(scanner) && f.endsWith(`.${config.format}`));
  return match ? path.join(checkoutDir, match) : null;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const managedScanService = {
  async triggerManualScan(input: TriggerManagedScanInput) {
    logger.scan.info('triggerManualScan', { repositoryId: input.repositoryId, workspaceId: input.workspaceId });

    try {
      const repoData = await projectRepository.findRepositoryByIdAndWorkspace(input.repositoryId, input.workspaceId);
      if (!repoData) throw new AppError('Repository not found or does not belong to this workspace', 404, SCAN.ERRORS.NOT_FOUND_CODE);
      if (input.projectId && repoData.project?.id !== input.projectId) throw new AppError('Repository not found in this project', 404, SCAN.ERRORS.NOT_FOUND_CODE);

      const repository = repoData.repository;
      if (!hasScmConnection(repository.connectionType)) {
        throw new AppError('Managed scans require SCM-connected repositories.', 400, SCAN.ERRORS.INVALID_REPOSITORY_TYPE_FOR_MANAGED_SCAN);
      }

      const scanners = normalizeScanners(input.scanners?.length ? input.scanners : [...DEFAULT_SCANNERS]);
      if (!scanners.length) throw new AppError('No supported scanners configured.', 400, SCAN.ERRORS.INVALID_SCANNERS);

      const branch = input.branch || repository.defaultBranch || DEFAULT_MANAGED_SCAN_BRANCH;
      const scan = await scanRepository.create({
        repositoryId: repository.id,
        branch,
        origin: SCAN_ORIGINS.MANAGED,
        status: 'queued',
        createdBy: input.userId,
        triggerSource: input.triggerSource ?? 'manual',
      });

      // Append triggered progress event
      await scanRepository.appendProgressEvent(scan.id, {
        id: randomUUID(),
        type: 'triggered',
        description: 'Scan triggered',
        timestamp: new Date().toISOString(),
      });

      const jobId = await enqueue(QUEUE_JOB_NAMES.RUN_MANAGED_SCAN, {
        scanId: scan.id, projectId: repoData.project?.id ?? null, repositoryId: repository.id,
        repositoryUrl: repository.url, branch, scanners, timeoutSeconds: DEFAULT_SCANNER_TIMEOUT_SECONDS, requestedBy: input.userId,
      } satisfies ManagedScanJobData);

      logger.scan.info('triggerManualScan completed', { scanId: scan.id, jobId });
      return { scanId: scan.id, jobId, status: scan.status, branch, scanners };
    } catch (error) {
      logger.scan.error('triggerManualScan failed', { error, repositoryId: input.repositoryId });
      throw error;
    }
  },

  async processManagedScanJob(data: ManagedScanJobData) {
    logger.scan.info('processManagedScanJob', { scanId: data.scanId, repositoryId: data.repositoryId });

    const workDir = await mkdtemp(path.join(os.tmpdir(), 'sast-managed-'));
    const executionResults: ScannerExecutionResult[] = [];
    const storage = await getStorageDriver();

    try {
      // Set running status (sets startedAt timestamp)
      await scanRepository.updateStatus(data.scanId, 'running');
      // Then immediately to processing (actual work begins)
      await scanRepository.updateStatus(data.scanId, 'processing');

      // Clone repository
      await scanRepository.appendProgressEvent(data.scanId, { id: randomUUID(), type: 'cloning', description: 'Preparing repository for scan', timestamp: new Date().toISOString() });
      const checkoutDir = path.join(workDir, 'repo');
      await checkoutRepository(data.repositoryUrl, data.branch, checkoutDir, data.timeoutSeconds);
      await scanRepository.appendProgressEvent(data.scanId, { id: randomUUID(), type: 'cloning', description: 'Repository cloned successfully', timestamp: new Date().toISOString() });

      // Run all scanners
      for (const scanner of data.scanners) {
        const result = await runSingleScanner(scanner, checkoutDir, data.scanId, data.timeoutSeconds, storage);
        executionResults.push(result);
      }

      // Check if all scanners failed
      const completed = executionResults.filter(r => r.status === 'completed');
      if (completed.length === 0 && executionResults.length > 0) {
        const summary = executionResults.map(r => `${r.scanner}(${r.status})`).join(', ');
        throw new AppError(`All scanners failed or were unavailable: ${summary}`, 500, 'SCANNERS_FAILED');
      }

      // Collect source context and code contexts BEFORE enqueuing parse jobs
      await collectAndStoreContexts(checkoutDir, data.scanId, executionResults, storage);

      // Enqueue parse jobs (AFTER source context is stored)
      for (const result of executionResults) {
        if (result.status === 'completed' && result.fileKey) {
          await safeEnqueueParseJob(data.scanId, result.fileKey, result.scanner, data.projectId);
        }
      }

      // Set status to parsing while parse jobs run in background
      await scanRepository.updateStatus(data.scanId, 'parsing');
      await scanRepository.appendProgressEvent(data.scanId, { id: randomUUID(), type: 'parsing', description: 'Scan output collected, parsing findings in background', timestamp: new Date().toISOString() });

      logger.scan.info('processManagedScanJob completed', { scanId: data.scanId, completed: completed.length });
      return { scanId: data.scanId, status: 'parsing' as const, executionResults };
    } catch (error) {
      await scanRepository.updateStatus(data.scanId, 'failed');
      await scanRepository.appendProgressEvent(data.scanId, {
        id: randomUUID(), type: 'failed',
        description: `Scan failed: ${(error as Error).message?.slice(0, 200)}`,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      logger.scan.error('processManagedScanJob failed', { error, scanId: data.scanId });
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },

  async processScheduledManagedScanJob(data: ScheduledManagedScanJobData) {
    logger.scan.info('processScheduledManagedScanJob', { repositoryId: data.repositoryId });
    try {
      const result = await this.triggerManualScan({ ...data, triggerSource: 'schedule' });
      logger.scan.info('processScheduledManagedScanJob completed', { repositoryId: data.repositoryId });
      return result;
    } catch (error) {
      logger.scan.error('processScheduledManagedScanJob failed', { error, repositoryId: data.repositoryId });
      throw error;
    }
  },

  async configureRepositorySchedule(repositoryId: string, cron?: string, timezone?: string) {
    logger.scan.info('configureRepositorySchedule', { repositoryId, cron, timezone });
    try {
      const [repo] = await db.select().from(repositories).where(and(eq(repositories.id, repositoryId), isNull(repositories.deletedAt))).limit(1);
      if (!repo) throw new AppError('Repository not found', 404, SCAN.ERRORS.NOT_FOUND_CODE);

      const cronExpression = cron || DEFAULT_MANAGED_SCAN_CRON;
      const tz = timezone || 'UTC';

      await db.insert(schedules).values({
        workspaceId: repo.workspaceId, repositoryId: repositoryId,
        branch: repo.defaultBranch ?? undefined, cronExpression: cronExpression,
        timezone: tz, active: true, createdBy: repo.createdBy ?? '',
      });

      await enqueue(QUEUE_JOB_NAMES.TRIGGER_SCHEDULED_MANAGED_SCAN, {
        workspaceId: repo.workspaceId, projectId: repo.projectId ?? null,
        repositoryId, userId: repo.createdBy ?? '', branch: repo.defaultBranch ?? undefined,
      } satisfies ScheduledManagedScanJobData, { priority: 0, retryLimit: 3 });

      logger.scan.info('configureRepositorySchedule completed', { repositoryId, cronExpression });
      return { repositoryId, cronExpression, timezone: tz, active: true };
    } catch (error) {
      logger.scan.error('configureRepositorySchedule failed', { error, repositoryId });
      throw error;
    }
  },
};

// ─── Internal Helpers ───────────────────────────────────────────────────────

async function runSingleScanner(
  scanner: ScannerId, checkoutDir: string, scanId: string,
  timeoutSeconds: number, storage: Awaited<ReturnType<typeof getStorageDriver>>,
): Promise<ScannerExecutionResult> {
  const isAvailable = await checkScannerAvailability(scanner);
  if (!isAvailable) {
    await scanRepository.appendProgressEvent(scanId, { id: randomUUID(), type: 'skipped', description: `${scanner} skipped — binary not installed`, timestamp: new Date().toISOString(), scanner });
    return { scanner, status: 'skipped', error: 'Scanner binary not installed' };
  }

  const startedAt = Date.now();
  await scanRepository.appendProgressEvent(scanId, { id: randomUUID(), type: 'scanning', description: `Running ${scanner}`, timestamp: new Date().toISOString(), scanner });

  try {
    const output = await runScanner(scanner, checkoutDir, timeoutSeconds);
    const fileKey = `${scanId}/${scanner}-${Date.now()}.${output.format}`;
    const outputBuffer = Buffer.from(output.content, 'utf-8');
    await storage.upload(outputBuffer, fileKey, { contentType: 'application/octet-stream' });

    await scanRepository.createScanResult({
      scanId: scanId, scanner, format: output.format,
      fileKey: fileKey, fileSize: outputBuffer.length,
      parsedSummary: { status: 'queued_for_processing', origin: SCAN_ORIGINS.MANAGED },
    });

    const duration = Math.floor((Date.now() - startedAt) / 1000);
    await scanRepository.appendProgressEvent(scanId, { id: randomUUID(), type: 'scanning', description: `${scanner} completed`, timestamp: new Date().toISOString(), scanner, durationSeconds: duration });

    return { scanner, status: 'completed', fileKey };
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    await scanRepository.appendProgressEvent(scanId, { id: randomUUID(), type: 'failed', description: `${scanner} failed: ${message.slice(0, 100)}`, timestamp: new Date().toISOString(), scanner, durationSeconds: duration });
    return { scanner, status: 'failed', error: message };
  }
}

async function collectAndStoreContexts(
  checkoutDir: string, scanId: string,
  executionResults: ScannerExecutionResult[],
  storage: Awaited<ReturnType<typeof getStorageDriver>>,
) {
  try {
    const { resolveCodeContextsBatch } = await import('./source-context');

    // Extract finding locations from all scanner outputs
    const allLocations: FindingLocation[] = [];
    for (const result of executionResults) {
      if (result.status !== 'completed') continue;
      try {
        const outputFile = await findScannerOutputFile(checkoutDir, result.scanner);
        if (!outputFile) continue;
        const rawOutput = await readFile(outputFile, 'utf-8');
        allLocations.push(...extractFindingLocations(result.scanner, rawOutput));
      } catch { /* skip parse errors */ }
    }

    // Resolve code contexts (function-level extraction)
    const codeContextMap = allLocations.length > 0
      ? await resolveCodeContextsBatch(checkoutDir, allLocations).catch(() => new Map())
      : new Map();

    // Collect raw source files
    const sourceContextMap = await collectSourceFiles(checkoutDir);

    // Upload source-context.json
    if (sourceContextMap.size > 0) {
      const obj: Record<string, string> = Object.fromEntries(sourceContextMap);
      await storage.upload(Buffer.from(JSON.stringify(obj), 'utf-8'), `${scanId}/source-context.json`, { contentType: 'application/json' });
      logger.scan.info('source context stored', { scanId, fileCount: sourceContextMap.size });
    }

    // Upload code-contexts.json
    if (codeContextMap.size > 0) {
      const obj: Record<string, { codeSnippet: string; codeSnippetStartLine: number }> = Object.fromEntries(codeContextMap);
      await storage.upload(Buffer.from(JSON.stringify(obj), 'utf-8'), `${scanId}/code-contexts.json`, { contentType: 'application/json' });
      logger.scan.info('code contexts stored', { scanId, count: codeContextMap.size });
    }
  } catch (err) {
    logger.scan.error('source context collection failed', { scanId, error: (err as Error).message });
  }
}

async function safeEnqueueParseJob(scanId: string, fileKey: string, scanner: ScannerId, projectId: string | null) {
  try {
    await enqueue('parse-scan-result', { scanId, fileKey, scanner, projectId });
  } catch (err) {
    logger.scan.error('enqueue parse job failed', { scanner, error: (err as Error).message, scanId });
  }
}

async function runScanner(scanner: ScannerId, targetDir: string, timeoutSeconds: number) {
  const config = SCANNER_COMMANDS[scanner];
  const args = config.args(targetDir);

  let result;
  try {
    result = await execFileAsync(config.command, args, {
      cwd: targetDir, timeout: timeoutSeconds * 1000,
      maxBuffer: MAX_SCANNER_OUTPUT_BUFFER_BYTES, windowsHide: true,
      env: config.env ? { ...process.env, ...config.env } : process.env,
    });
  } catch (error: unknown) {
    const err = error as { code?: number; stdout?: string; stderr?: string };

    // Gitleaks exits with code 1 when leaks are found
    if (err.code === 1 && config.outputStream) {
      try {
        const content = await readFile(path.join(targetDir, config.outputStream), 'utf-8');
        if (content.length > 0) return { format: config.format, content };
      } catch { /* fall through */ }
    }

    // Semgrep may output valid JSON on non-zero exit
    if (err.stdout && scanner === 'semgrep') {
      const stdout = typeof err.stdout === 'string' ? err.stdout : String(err.stdout);
      if (stdout.trim().length > 0) return { format: config.format, content: stdout };
    }

    // Text-based scanners (clang-tidy, gcc-fanalyzer) output to stderr
    // and may exit with non-zero codes. Capture their output.
    const textScanners = ['clang-tidy', 'gcc-fanalyzer'];
    if (textScanners.includes(scanner)) {
      const stderr = typeof err.stderr === 'string' ? err.stderr : String(err.stderr || '');
      const stdout = typeof err.stdout === 'string' ? err.stdout : String(err.stdout || '');
      const output = stdout || stderr;
      if (output.length > 0) return { format: config.format, content: output };
    }

    // Other scanners may output on stdout
    if (err.stdout) {
      const stdout = typeof err.stdout === 'string' ? err.stdout : String(err.stdout);
      if (stdout.length > 0) return { format: config.format, content: stdout };
    }

    throw error;
  }

  let content = result.stdout || result.stderr || '';
  if (config.outputStream) {
    try { content = await readFile(path.join(targetDir, config.outputStream), 'utf-8'); } catch { /* fall back to stdout */ }
  }

  // Some scanners (cppcheck --xml) write primary output to stderr
  // Prefer whichever stream has the actual structured content
  if (scanner === 'cppcheck') {
    const stderr = String(result.stderr || '');
    if (stderr.includes('<?xml') && !content.includes('<?xml')) {
      content = stderr;
    }
  }

  return { format: config.format, content };
}
