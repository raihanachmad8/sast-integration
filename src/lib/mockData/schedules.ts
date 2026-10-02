export interface Schedule {
  id: string;
  workspace_id: string;
  repo: string;
  branch: string;
  frequency: string;
  cron: string;
  timezone: string;
  policy: string;
  next_run: string;
  last_runs: string[];
  active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'schedule-1',
    workspace_id: 'ws-1',
    repo: 'backend-api',
    branch: 'main',
    frequency: 'Daily',
    cron: '0 1 * * *',
    timezone: 'Asia/Jakarta',
    policy: 'Standard Workspace Policy',
    next_run: 'Tonight 01:00',
    last_runs: ['pass', 'pass', 'fail'],
    active: true,
    created_at: '2026-01-15T00:00:00.000Z',
    created_by: 'admin@sast.local',
    updated_at: '2026-05-28T10:00:00.000Z',
    updated_by: 'admin@sast.local',
    deleted_at: null,
    deleted_by: null,
  },
  {
    id: 'schedule-2',
    workspace_id: 'ws-1',
    repo: 'customer-web',
    branch: 'release',
    frequency: 'Weekly',
    cron: '0 2 * * 1',
    timezone: 'Asia/Jakarta',
    policy: 'Release Comprehensive',
    next_run: 'Monday 02:00',
    last_runs: ['pass', 'pass', 'pass'],
    active: false,
    created_at: '2026-02-20T00:00:00.000Z',
    created_by: 'admin@sast.local',
    updated_at: '2026-05-25T14:30:00.000Z',
    updated_by: 'admin@sast.local',
    deleted_at: null,
    deleted_by: null,
  },
  {
    id: 'schedule-3',
    workspace_id: 'ws-1',
    repo: 'auth-service',
    branch: 'main',
    frequency: 'Daily',
    cron: '0 3 * * *',
    timezone: 'UTC',
    policy: 'Standard Workspace Policy',
    next_run: 'Tonight 03:00 UTC',
    last_runs: ['pass', 'fail', 'pass'],
    active: true,
    created_at: '2026-03-10T00:00:00.000Z',
    created_by: 'admin@sast.local',
    updated_at: '2026-05-30T08:15:00.000Z',
    updated_by: 'admin@sast.local',
    deleted_at: null,
    deleted_by: null,
  },
  {
    id: 'schedule-4',
    workspace_id: 'ws-1',
    repo: 'mobile-sdk',
    branch: 'develop',
    frequency: 'Hourly',
    cron: '0 * * * *',
    timezone: 'America/New_York',
    policy: 'PR Quick Check',
    next_run: 'Next hour',
    last_runs: ['pass', 'pass', 'pass', 'pass', 'fail'],
    active: true,
    created_at: '2026-04-05T00:00:00.000Z',
    created_by: 'admin@sast.local',
    updated_at: '2026-06-01T12:00:00.000Z',
    updated_by: 'admin@sast.local',
    deleted_at: null,
    deleted_by: null,
  },
  {
    id: 'schedule-5',
    workspace_id: 'ws-1',
    repo: 'infra-terraform',
    branch: 'main',
    frequency: 'Monthly',
    cron: '0 4 1 * *',
    timezone: 'Europe/London',
    policy: 'Release Comprehensive',
    next_run: 'June 1 04:00',
    last_runs: ['pass', 'pass'],
    active: true,
    created_at: '2026-05-01T00:00:00.000Z',
    created_by: 'admin@sast.local',
    updated_at: '2026-05-01T00:00:00.000Z',
    updated_by: 'admin@sast.local',
    deleted_at: null,
    deleted_by: null,
  },
];
