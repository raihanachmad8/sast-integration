/**
 * Mock scheduled scan configuration.
 *
 * @example
 * ```ts
 * const schedule: Schedule = {
 *   id: 'sch_01',
 *   workspaceId: 'ws_01',
 *   repo: 'backend-api',
 *   branch: 'main',
 *   frequency: 'Daily',
 *   cron: '0 1 * * *',
 *   timezone: 'Asia/Jakarta',
 *   policy: 'Standard Workspace Policy',
 *   nextRun: 'Tonight 01:00',
 *   lastRuns: ['pass', 'pass', 'fail'],
 *   active: true,
 *   createdAt: '2026-01-15T00:00:00.000Z',
 *   createdBy: 'admin@sast.local',
 *   updatedAt: '2026-05-28T10:00:00.000Z',
 *   updatedBy: 'admin@sast.local',
 *   deletedAt: null,
 *   deletedBy: null,
 * };
 * ```
 */
export interface Schedule {
  /** Unique schedule ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
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
  /** Email of who created the schedule. */
  createdBy: string | null;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
  /** Email of who last updated the schedule. */
  updatedBy: string | null;
  /** ISO 8601 soft-delete timestamp. */
  deletedAt: string | null;
  /** Email of who deleted the schedule. */
  deletedBy: string | null;
}

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'sch_01',
    workspaceId: 'ws_01',
    repo: 'backend-api',
    branch: 'main',
    frequency: 'Daily',
    cron: '0 1 * * *',
    timezone: 'Asia/Jakarta',
    policy: 'Standard Workspace Policy',
    nextRun: 'Tonight 01:00',
    lastRuns: ['pass', 'pass', 'fail'],
    active: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    createdBy: 'admin@sast.local',
    updatedAt: '2026-05-28T10:00:00.000Z',
    updatedBy: 'admin@sast.local',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 'sch_02',
    workspaceId: 'ws_01',
    repo: 'customer-web',
    branch: 'release',
    frequency: 'Weekly',
    cron: '0 2 * * 1',
    timezone: 'Asia/Jakarta',
    policy: 'Release Comprehensive',
    nextRun: 'Monday 02:00',
    lastRuns: ['pass', 'pass', 'pass'],
    active: false,
    createdAt: '2026-02-20T00:00:00.000Z',
    createdBy: 'admin@sast.local',
    updatedAt: '2026-05-25T14:30:00.000Z',
    updatedBy: 'admin@sast.local',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 'sch_03',
    workspaceId: 'ws_01',
    repo: 'auth-service',
    branch: 'main',
    frequency: 'Daily',
    cron: '0 3 * * *',
    timezone: 'UTC',
    policy: 'Standard Workspace Policy',
    nextRun: 'Tonight 03:00 UTC',
    lastRuns: ['pass', 'fail', 'pass'],
    active: true,
    createdAt: '2026-03-10T00:00:00.000Z',
    createdBy: 'admin@sast.local',
    updatedAt: '2026-05-30T08:15:00.000Z',
    updatedBy: 'admin@sast.local',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 'sch_04',
    workspaceId: 'ws_01',
    repo: 'mobile-sdk',
    branch: 'develop',
    frequency: 'Hourly',
    cron: '0 * * * *',
    timezone: 'America/New_York',
    policy: 'PR Quick Check',
    nextRun: 'Next hour',
    lastRuns: ['pass', 'pass', 'pass', 'pass', 'fail'],
    active: true,
    createdAt: '2026-04-05T00:00:00.000Z',
    createdBy: 'admin@sast.local',
    updatedAt: '2026-06-01T12:00:00.000Z',
    updatedBy: 'admin@sast.local',
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: 'sch_05',
    workspaceId: 'ws_01',
    repo: 'infra-terraform',
    branch: 'main',
    frequency: 'Monthly',
    cron: '0 4 1 * *',
    timezone: 'Europe/London',
    policy: 'Release Comprehensive',
    nextRun: 'June 1 04:00',
    lastRuns: ['pass', 'pass'],
    active: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    createdBy: 'admin@sast.local',
    updatedAt: '2026-05-01T00:00:00.000Z',
    updatedBy: 'admin@sast.local',
    deletedAt: null,
    deletedBy: null,
  },
];
