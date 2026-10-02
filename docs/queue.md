# Background Queue System (pg-boss)

This project uses **pg-boss** as the background job processor. All jobs are stored in a dedicated `pgboss` schema inside the same Postgres database (no extra infrastructure required).

## Why We Use a Queue

- Some scanner reports (especially Trivy or large SARIF) can be very big.
- We want to keep the `POST /projects/:id/scans/upload` endpoint fast and responsive for CI pipelines.
- Parsing + finding creation + deduplication can be CPU/memory intensive.

## Architecture

- **Sync path** (default for small files): Parsing happens immediately inside the request. Findings appear instantly.
- **Async path**: Files above `ASYNC_PARSE_THRESHOLD_BYTES` (currently 5MB) are uploaded to object storage and a job is enqueued. A background worker picks it up.

## Important Job Names

Defined in `src/commons/constants/queue.ts` and `src/server/modules/scan/constants.ts`:

- `parse-scan-result` — Downloads a raw report from storage, parses it, creates findings with deduplication (via `finding_groups`), and updates `scan_results.parsed_summary`.
- `cleanup-old-scan-files` — Daily retention job (03:00 UTC). Deletes raw scanner files older than `RETENTION_DAYS` (default 30) from object storage and clears `file_key` / `file_size`. Supports dry-run mode. Can be manually triggered via `/api/v1/retention/cleanup?dryRun=true`.
- `run-managed-scan` — Executes a managed SCM scan: clones repository, runs scanners from attached policy, uploads results, enqueues parse jobs.
- `trigger-scheduled-managed-scan` — Cron-triggered job that finds due schedules and enqueues `run-managed-scan` jobs.
- `ai-verify-findings` — Verifies findings using AI models (enqueued after parsing if policy.ai_verification = 'enabled').

## Worker Registration

Workers are registered once when the Next.js server starts in Node.js runtime (in `src/instrumentation.ts`):

```ts
// parse results
await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, processParseScanResultJob);

// retention cleanup (also scheduled daily at 03:00)
await queue.work(CLEANUP_OLD_SCAN_FILES_JOB_NAME, processCleanupOldScanFilesJob);
await queue.schedule(CLEANUP_OLD_SCAN_FILES_JOB_NAME, '0 3 * * *');

// managed scan execution
await queue.work(QUEUE_JOBS.RUN_MANAGED_SCAN, processManagedScanJob);

// scheduled scan trigger
await queue.work(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, processScheduledManagedScanJob);
```

Workers run in the same process as the Next.js server — no separate worker process needed.

The retention job can also be triggered manually (with optional `dryRun`). See the [Managed Scanning architecture doc](./managed-scanning-and-scanner-policies.md).

### AI Verification Job

- **Job name**: `ai-verify-findings`
- **Handler**: `processAiVerifyJob` in `jobs/ai-verify-finding.job.ts`
- **Trigger**: Enqueued after parsing completes (if `policy.ai_verification = 'enabled'`)
- **Logic**: Calls `aiVerificationService.batchVerify()` to verify all findings in a scan
- **Output**: Stores verification results in `ai_verifications` table, updates finding status
- **Data**: `{ scanId, modelId }`

## Enqueuing Jobs

Use the helper from anywhere:

```ts
import { enqueue, SCAN_PARSE_JOB_NAME } from '@/server/modules/scan/constants';

await enqueue(SCAN_PARSE_JOB_NAME, {
  scanId,
  projectId,
  scanResultId,
  scanner,
  fileKey,
});
```

## Monitoring & Operations

- pg-boss stores jobs in the `pgboss` schema. You can query `pgboss.job` and `pgboss.job_state` tables directly for debugging.
- Failed jobs are retried automatically (default 3 attempts).
- There is currently no admin UI. For production you can add one later (pg-boss has a simple web UI package if needed).

## Adding New Job Types

1. Create a new file under `src/server/modules/queue/jobs/`.
2. Export a handler function (ideally with JSDoc and typed input).
3. Register it in `instrumentation.ts` (only inside `if (process.env.NEXT_RUNTIME === 'nodejs')`).
4. Add the job name to `QUEUE_JOB_NAMES` in `src/server/modules/scan/constants.ts`.
5. Re-export via `src/commons/constants/scan.ts` if it needs to be used from many places.

See the retention cleanup job as a recent example (supports `dryRun`).

## Current Limitations (as of 2026-06)

- Four worker types registered: `parse-scan-result`, `cleanup-old-scan-files`, `run-managed-scan`, `trigger-scheduled-managed-scan`
- AI verification job (`ai-verify-findings`) is enqueued dynamically after parsing
- No dead-letter queue handling beyond pg-boss defaults
- No rate limiting or priority tuning yet (all jobs use default priority)
