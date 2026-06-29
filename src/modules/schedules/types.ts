/**
 * Scheduled scan configuration.
 *
 * @example
 * ```ts
 * const schedule: ScheduleItem = {
 *   id: 'schedule-1',
 *   repo: 'backend-api',
 *   branch: 'main',
 *   frequency: 'Daily',
 *   cron: '0 1 * * *',
 *   timezone: 'Asia/Jakarta',
 *   policy: 'Standard Workspace Policy',
 *   nextRun: 'Tonight 01:00',
 *   lastRuns: ['pass', 'pass', 'fail'],
 *   active: true,
 *   createdAt: '2026-01-15T00:00:00Z',
 * };
 * ```
 */
export interface ScheduleItem {
  /** Unique schedule ID. */
  id: string;
  /** Repository name. */
  repo: string;
  /** Branch to scan. */
  branch: string;
  /** Human-readable frequency label. */
  frequency: string;
  /** Cron expression. */
  cron: string;
  /** Timezone identifier. */
  timezone: string;
  /** Scan policy name. */
  policy: string;
  /** Human-readable next run time. */
  nextRun: string;
  /** Recent run statuses ('pass' | 'fail'). */
  lastRuns: string[];
  /** Whether the schedule is active. */
  active: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/**
 * Payload for creating a new scan schedule.
 *
 * @example
 * ```ts
 * const payload: CreateSchedulePayload = {
 *   repositoryId: 'repo_01',
 *   branch: 'main',
 *   cronExpression: '0 1 * * *',
 *   timezone: 'Asia/Jakarta',
 *   policyId: 'pol_01',
 * };
 * ```
 */
export interface CreateSchedulePayload {
  /** Repository ID to schedule. */
  repositoryId: string;
  /** Branch to scan. */
  branch: string;
  /** Cron expression (e.g. '0 1 * * *'). */
  cronExpression: string;
  /** Timezone identifier. */
  timezone: string;
  /** Scan policy ID. */
  policyId: string;
}
