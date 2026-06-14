/**
 * Schedule types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-schedules
 */

/**
 * Mock scheduled scan — cron-based recurring scan configuration.
 *
 * @example
 * ```ts
 * const schedule: ScheduleRow = {
 *   id: 'sch_01',
 *   repositoryId: 'repo_01',
 *   repositoryName: 'backend-api',
 *   branch: 'main',
 *   timezone: 'UTC',
 *   cronExpression: '0 2 * * 1-5',
 *   active: true,
 *   lastRunAt: '2026-06-04T02:00:00Z',
 *   nextRunAt: '2026-06-05T02:00:00Z',
 *   createdAt: '2026-03-01T08:00:00Z',
 * };
 * ```
 */
export type ScheduleRow = {
  /** Unique schedule ID. */
  id: string;
  /** Repository ID to scan. */
  repositoryId: string;
  /** Repository display name. */
  repositoryName: string;
  /** Branch to scan. */
  branch: string;
  /** Timezone identifier. */
  timezone: string;
  /** Cron expression (e.g. '0 2 * * 1-5'). */
  cronExpression: string;
  /** Whether the schedule is active. */
  active: boolean;
  /** ISO 8601 last execution timestamp. */
  lastRunAt: string | null;
  /** ISO 8601 next execution timestamp. */
  nextRunAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};
