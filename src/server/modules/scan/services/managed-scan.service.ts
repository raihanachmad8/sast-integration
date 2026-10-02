import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanPolicyRepository } from '@/server/modules/scan/repositories/scan-policy.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { enqueue, getQueue } from '@/server/modules/queue/queue.service';
import { AppError } from '@/server/http/errors';
import {
  QUEUE_JOB_NAMES,
  SCAN_PARSE_JOB_NAME,
  SCAN_ORIGINS,
  type SupportedScanner,
} from '@/server/modules/scan/constants';
import { REPOSITORY_CONNECTION_TYPES } from '@/server/modules/project/constants';
import {
  SCANNER_COMMANDS,
  DEFAULT_SCANNER_TIMEOUT_SECONDS,
  DEFAULT_GIT_CLONE_DEPTH,
  DEFAULT_MANAGED_SCAN_BRANCH,
  DEFAULT_MANAGED_SCAN_CRON,
  MAX_SCANNER_OUTPUT_BUFFER_BYTES,
  type ScannerCommandConfig,
} from '@/server/modules/scan/scanners';
import { checkScannerAvailability } from '../scanner-availability';

const execFileAsync = promisify(execFile);

export interface TriggerManagedScanInput {
  workspaceId: string;
  projectId?: string;
  repositoryId: string;
  userId: string;
  branch?: string;
  triggerSource?: 'manual' | 'schedule' | 'webhook';
}

export interface ManagedScanJobData {
  scanId: string;
  projectId: string;
  repositoryId: string;
  repositoryUrl: string;
  branch: string;
  policyId: string;
  scanners: SupportedScanner[];
  timeoutSeconds: number;
  requestedBy: string;
}

export interface ScheduledManagedScanJobData {
  workspaceId: string;
  projectId: string;
  repositoryId: string;
  userId: string;
  branch?: string;
}

/** Per-scanner execution result for tracking in scan records */
export interface ScannerExecutionResult {
  scanner: SupportedScanner;
  status: 'completed' | 'failed' | 'skipped';
  error?: string;
  findingsCount?: number;
}

/**
 * Service responsible for orchestrating **Managed (Platform-driven) Scans**.
 *
 * This is the core of the "full managed scan execution" capability.
 * It handles:
 * - Validation that a repository is eligible for managed scanning (must be `connection_type = 'scm'` + have an attached policy)
 * - Creation of the Scan record
 * - Enqueuing of the actual execution work to the background queue
 * - Configuration of scheduled recurring managed scans
 *
 * All heavy lifting (git checkout + actual scanner CLI execution) happens inside
 * the queue worker (`processManagedScanJob`).
 */
export const managedScanService = {
  /**
   * Triggers a managed scan for a repository.
   * The actual execution happens asynchronously via the queue.
   */
  async triggerManualScan(input: TriggerManagedScanInput) {
    const repoData = await projectRepository.findRepositoryByIdAndWorkspace(
      input.repositoryId,
      input.workspaceId
    );

    if (!repoData) {
      throw new AppError('Repository not found or does not belong to this workspace', 404, 'NOT_FOUND');
    }

    if (input.projectId && repoData.project.id !== input.projectId) {
      throw new AppError('Repository not found in this project', 404, 'NOT_FOUND');
    }

    const repository = repoData.repository;
    if (repository.connection_type !== REPOSITORY_CONNECTION_TYPES.SCM) {
      throw new AppError(
        'Managed scans can only run on SCM-connected repositories. External repositories only support CI uploads.',
        400,
        'INVALID_REPOSITORY_TYPE_FOR_MANAGED_SCAN'
      );
    }

    if (!repository.current_policy_id) {
      throw new AppError('Attach a scan policy before running a managed scan.', 400, 'SCAN_POLICY_REQUIRED');
    }

    const policy = await scanPolicyRepository.findById(repository.current_policy_id);
    if (!policy || policy.workspace_id !== input.workspaceId) {
      throw new AppError('Attached scan policy was not found in this workspace.', 404, 'SCAN_POLICY_NOT_FOUND');
    }

    const scanners = normalizeScanners(policy.scanners);
    if (!scanners.length) {
      throw new AppError('Attached scan policy has no supported scanners configured.', 400, 'SCAN_POLICY_INVALID');
    }

    const branch = input.branch || repository.default_branch || DEFAULT_MANAGED_SCAN_BRANCH;
    const scan = await scanRepository.create({
      repositoryId: repository.id,
      policyId: policy.id,
      branch,
      commitSha: null,
      origin: SCAN_ORIGINS.MANAGED,
      triggerSource: input.triggerSource ?? 'manual',
      status: 'queued',
      createdBy: input.userId,
    });

    const jobId = await enqueue(QUEUE_JOB_NAMES.RUN_MANAGED_SCAN, {
      scanId: scan.id,
      projectId: repoData.project.id,
      repositoryId: repository.id,
      repositoryUrl: repository.url,
      branch,
      policyId: policy.id,
      scanners,
      timeoutSeconds: policy.timeout_seconds ?? DEFAULT_SCANNER_TIMEOUT_SECONDS,
      requestedBy: input.userId,
    } satisfies ManagedScanJobData);

    return {
      scanId: scan.id,
      jobId,
      status: scan.status,
      branch,
      scanners,
    };
  },

  /**
   * Enable, disable, or update the recurring scan schedule for a repository.
   *
   * When activated, schedules a recurring managed scan via the queue system.
   * When deactivated, removes the schedule and disables it in the database.
   *
   * @param input.workspaceId - The workspace that owns the repository
   * @param input.projectId - The project the repository belongs to
   * @param input.repositoryId - The repository to schedule scans for
   * @param input.userId - The user performing the action
   * @param input.active - Whether the schedule should be active
   * @param input.cronExpression - Cron expression for scheduling (default: daily at 03:00 UTC)
   * @param input.timezone - Timezone for the cron schedule (default: 'UTC')
   * @param input.branch - Branch to scan (default: repository's default branch)
   * @returns The schedule record or `{ active: false }` when disabling
   */
  async configureRepositorySchedule(input: {
    workspaceId: string;
    projectId: string;
    repositoryId: string;
    userId: string;
    active: boolean;
    cronExpression?: string;
    timezone?: string;
    branch?: string;
  }) {
    const repoData = await projectRepository.findRepositoryByIdAndWorkspace(
      input.repositoryId,
      input.workspaceId
    );

    if (!repoData || repoData.project.id !== input.projectId) {
      throw new AppError('Repository not found in this project', 404, 'NOT_FOUND');
    }

    if (!repoData.repository.current_policy_id) {
      throw new AppError('Attach a scan policy before enabling scheduled managed scans.', 400, 'SCAN_POLICY_REQUIRED');
    }

    const scheduleKey = input.repositoryId;
    const queue = await getQueue();

    if (!input.active) {
      await queue.unschedule(QUEUE_JOB_NAMES.TRIGGER_SCHEDULED_MANAGED_SCAN, scheduleKey);
      await scanRepository.disableRepositorySchedule(input.repositoryId);
      return { active: false };
    }

    const cronExpression = input.cronExpression || DEFAULT_MANAGED_SCAN_CRON;
    const timezone = input.timezone || 'UTC';
    const branch = input.branch || repoData.repository.default_branch || DEFAULT_MANAGED_SCAN_BRANCH;

    const schedule = await scanRepository.replaceRepositorySchedule({
      repositoryId: input.repositoryId,
      policyId: repoData.repository.current_policy_id,
      branch,
      cronExpression,
      timezone,
      active: true,
      createdBy: input.userId,
    });

    await queue.schedule(
      QUEUE_JOB_NAMES.TRIGGER_SCHEDULED_MANAGED_SCAN,
      cronExpression,
      {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        userId: input.userId,
        branch,
      } satisfies ScheduledManagedScanJobData,
      { key: scheduleKey, tz: timezone }
    );

    return schedule;
  },
};

/**
 * Queue worker entry point for scheduled recurring managed scans.
 *
 * Delegates to `managedScanService.triggerManualScan` with triggerSource 'schedule'.
 *
 * @param job - Queue job containing the scheduled scan parameters
 * @returns The result of the triggered managed scan
 */
export async function processScheduledManagedScanJob(job: { data: ScheduledManagedScanJobData }) {
  return managedScanService.triggerManualScan({
    ...job.data,
    triggerSource: 'schedule',
  });
}

/**
 * Queue worker that performs the actual managed scan execution.
 *
 * Responsibilities:
 * - Clone the repository (shallow clone for speed)
 * - Run each scanner defined in the policy
 * - Upload raw results to object storage
 * - Enqueue parsing jobs (reuse the existing parse pipeline)
 * - Cleanup temporary directories
 *
 * This function is intentionally separated from the trigger logic so it can be
 * retried independently by the queue system.
 *
 * Implements graceful degradation:
 * - Checks scanner availability before execution
 * - Skips unavailable scanners with warning log
 * - Continues to next scanner on failure
 * - Only fails the scan if ALL scanners failed or were unavailable
 */
export async function processManagedScanJob(job: { data: ManagedScanJobData }) {
  const data = job.data;
  const workDir = await mkdtemp(path.join(os.tmpdir(), 'sast-managed-'));
  const executionResults: ScannerExecutionResult[] = [];

  try {
    await scanRepository.updateStatus(data.scanId, 'processing');
    const checkoutDir = path.join(workDir, 'repo');
    await checkoutRepository(data.repositoryUrl, data.branch, checkoutDir, data.timeoutSeconds);

    for (const scanner of data.scanners) {
      // Pre-flight: check if scanner binary is available on this system
      const isAvailable = await checkScannerAvailability(scanner);
      if (!isAvailable) {
        console.warn(`[ManagedScan] Skipping ${scanner}: binary not found on this system`);
        executionResults.push({ scanner, status: 'skipped', error: 'Scanner binary not installed' });
        continue;
      }

      try {
        const output = await runScanner(scanner, checkoutDir, data.timeoutSeconds);
        const fileName = `${data.scanId}/${scanner}-${Date.now()}.${output.format}`;
        const upload = await getStorageDriver().upload(Buffer.from(output.content), fileName, {
          contentType: contentTypeForFormat(output.format),
          metadata: {
            scanId: data.scanId,
            repositoryId: data.repositoryId,
            policyId: data.policyId,
            scanner,
            origin: SCAN_ORIGINS.MANAGED,
          },
        });

        const scanResult = await scanRepository.createScanResult({
          scanId: data.scanId,
          scanner,
          format: output.format,
          fileKey: upload.key,
          fileSize: upload.size,
          parsedSummary: { status: 'queued_for_processing', origin: SCAN_ORIGINS.MANAGED },
        });

        await enqueue(SCAN_PARSE_JOB_NAME, {
          scanId: data.scanId,
          projectId: data.projectId,
          scanResultId: scanResult.id,
          scanner,
          fileKey: upload.key,
        });

        executionResults.push({ scanner, status: 'completed' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ManagedScan] Scanner ${scanner} failed:`, message);
        executionResults.push({ scanner, status: 'failed', error: message });
        // Continue to next scanner instead of stopping
      }
    }

    // Only fail the scan if ALL scanners failed or were unavailable
    const completedCount = executionResults.filter(r => r.status === 'completed').length;
    if (completedCount === 0 && executionResults.length > 0) {
      const summary = executionResults.map(r => `${r.scanner}(${r.status})`).join(', ');
      throw new Error(`All scanners failed or were unavailable: ${summary}`);
    }

    // Log partial success summary
    const skippedCount = executionResults.filter(r => r.status === 'skipped').length;
    const failedCount = executionResults.filter(r => r.status === 'failed').length;
    if (skippedCount > 0 || failedCount > 0) {
      console.info(
        `[ManagedScan] Scan ${data.scanId} completed with partial results: ` +
        `${completedCount} completed, ${skippedCount} skipped, ${failedCount} failed`
      );
    }
  } catch (error) {
    await scanRepository.updateStatus(data.scanId, 'failed');
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function normalizeScanners(value: unknown): SupportedScanner[] {
  if (!Array.isArray(value)) return [];
  return value.filter((scanner): scanner is SupportedScanner => scanner in SCANNER_COMMANDS);
}

/**
 * Performs a shallow git clone of the target repository.
 * Uses --depth 1 for speed (we only need the latest code for scanning).
 */
async function checkoutRepository(url: string, branch: string, targetDir: string, timeoutSeconds: number) {
  await execFileAsync('git', ['clone', '--depth', String(DEFAULT_GIT_CLONE_DEPTH), '--branch', branch, url, targetDir], {
    timeout: timeoutSeconds * 1000,
    windowsHide: true,
  });
}

/**
 * Execute a scanner CLI tool against the checked-out repository
 * and return its output content and format.
 *
 * @param scanner - The scanner type to run (must be a SupportedScanner)
 * @param targetDir - The directory containing the checked-out source code
 * @param timeoutSeconds - Maximum execution time in seconds
 * @returns The scanner output content and its format
 */
async function runScanner(scanner: SupportedScanner, targetDir: string, timeoutSeconds: number) {
  const config = SCANNER_COMMANDS[scanner];
  const result = await execFileAsync(config.command, config.args(targetDir), {
    cwd: targetDir,
    timeout: timeoutSeconds * 1000,
    maxBuffer: MAX_SCANNER_OUTPUT_BUFFER_BYTES,
    windowsHide: true,
  });

  const content = config.outputStream === 'stderr' ? result.stderr : result.stdout;
  return {
    format: config.format,
    content: content || emptyScannerOutput(scanner),
  };
}

/**
 * Return a valid empty output string for a scanner when no output was produced.
 * This allows downstream parsers to process the result without null checks.
 *
 * @param scanner - The scanner type
 * @returns A valid empty report string in the scanner's expected format
 */
function emptyScannerOutput(scanner: SupportedScanner): string {
  if (scanner === 'cppcheck') return '<results></results>';
  if (scanner === 'sarif') return JSON.stringify({ version: '2.1.0', runs: [] });
  return JSON.stringify({ results: [] });
}

/**
 * Map a scanner output format to its corresponding HTTP Content-Type.
 *
 * @param format - The scanner output format (json, xml, sarif, text)
 * @returns The MIME content type string
 */
function contentTypeForFormat(format: ScannerCommandConfig['format']): string {
  switch (format) {
    case 'xml':
      return 'application/xml';
    case 'sarif':
    case 'json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}
