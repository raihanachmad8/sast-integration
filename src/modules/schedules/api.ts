/**
 * Schedules API module.
 *
 * Provides functions for managing automated scan schedules.
 * Schedules define cron-based triggers for recurring scans.
 *
 * @example
 * ```ts
 * import { listSchedules, createSchedule } from '@/modules/schedules/api';
 *
 * // List all schedules in a workspace
 * const schedules = await listSchedules('workspace-id-123');
 *
 * // Create a new schedule
 * const newSchedule = await createSchedule('workspace-id-123', {
 *   repositoryId: 'repo-uuid',
 *   policyId: 'policy-uuid',
 *   branch: 'main',
 *   cronExpression: '0 2 * * *',
 *   timezone: 'UTC',
 *   active: true,
 * });
 * ```
 */

import { apiFetch, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/**
 * Schedule definition for automated scans.
 */
export interface Schedule {
  /** Unique identifier */
  id: string;
  /** Repository ID to scan */
  repositoryId: string;
  /** Repository name (populated from join) */
  repositoryName: string;
  /** Scan policy ID to apply */
  policyId: string;
  /** Policy name (populated from join) */
  policyName?: string;
  /** Git branch to scan */
  branch: string;
  /** Cron expression (e.g., '0 2 * * *' for daily at 2am) */
  cronExpression: string;
  /** Timezone for cron schedule */
  timezone: string;
  /** Whether schedule is active */
  active: boolean;
  /** Last execution timestamp */
  lastRunAt?: string;
  /** Next scheduled execution */
  nextRunAt?: string;
  /** User ID who created the schedule */
  createdBy: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * List all schedules in a workspace.
 *
 * @param workspaceId - The workspace ID to list schedules for
 * @returns Promise resolving to array of schedules
 * @throws {ApiRequestError} On network or server error
 *
 * @example
 * ```ts
 * const schedules = await listSchedules('ws-123');
 * schedules.forEach(s => {
 *   console.log(`${s.branch}: ${s.cronExpression} (${s.active ? 'active' : 'inactive'})`);
 * });
 * ```
 */
export async function listSchedules(workspaceId: string): Promise<Schedule[]> {
  return apiFetch<Schedule[]>(ENDPOINTS.SCHEDULES.LIST(workspaceId));
}

/**
 * Get a single schedule by ID.
 *
 * @param workspaceId - The workspace ID
 * @param scheduleId - The schedule ID to retrieve
 * @returns Promise resolving to the schedule, or null if not found
 *
 * @example
 * ```ts
 * const schedule = await getSchedule('ws-123', 'sch-456');
 * if (schedule) {
 *   console.log(`Next run: ${schedule.nextRunAt}`);
 * }
 * ```
 */
export async function getSchedule(workspaceId: string, scheduleId: string): Promise<Schedule | null> {
  return apiFetch<Schedule>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, scheduleId)).catch(() => null);
}

/**
 * Create a new schedule.
 *
 * @param workspaceId - The workspace ID
 * @param data - Schedule data (repositoryId, policyId, branch, cronExpression required)
 * @returns Promise resolving to the created schedule
 * @throws {ApiRequestError} On validation or server error
 *
 * @example
 * ```ts
 * const schedule = await createSchedule('ws-123', {
 *   repositoryId: 'repo-789',
 *   policyId: 'policy-012',
 *   branch: 'develop',
 *   cronExpression: '0 6 * * 1-5',  // Weekdays at 6am
 *   timezone: 'Asia/Jakarta',
 *   active: true,
 * });
 * ```
 */
export async function createSchedule(workspaceId: string, data: Partial<Schedule>): Promise<Schedule> {
  return apiPost<Schedule>(ENDPOINTS.SCHEDULES.LIST(workspaceId), data);
}

/**
 * Update an existing schedule.
 *
 * @param workspaceId - The workspace ID
 * @param scheduleId - The schedule ID to update
 * @param data - Partial schedule data to update
 * @returns Promise resolving to the updated schedule
 * @throws {ApiRequestError} On validation or server error
 *
 * @example
 * ```ts
 * const updated = await updateSchedule('ws-123', 'sch-456', {
 *   cronExpression: '0 3 * * *',  // Change to 3am
 *   active: false,  // Temporarily disable
 * });
 * ```
 */
export async function updateSchedule(workspaceId: string, scheduleId: string, data: Partial<Schedule>): Promise<Schedule> {
  return apiPut<Schedule>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, scheduleId), data);
}

/**
 * Delete a schedule.
 *
 * @param workspaceId - The workspace ID
 * @param scheduleId - The schedule ID to delete
 * @throws {ApiRequestError} On server error
 *
 * @example
 * ```ts
 * await deleteSchedule('ws-123', 'sch-456');
 * console.log('Schedule deleted');
 * ```
 */
export async function deleteSchedule(workspaceId: string, scheduleId: string): Promise<void> {
  await apiDelete(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, scheduleId));
}

/**
 * Toggle schedule active/inactive status.
 *
 * @param workspaceId - The workspace ID
 * @param scheduleId - The schedule ID to toggle
 * @param active - New active state
 * @returns Promise resolving to the updated schedule
 * @throws {ApiRequestError} On server error
 *
 * @example
 * ```ts
 * // Disable a schedule
 * const updated = await toggleSchedule('ws-123', 'sch-456', false);
 * console.log(`Schedule ${updated.active ? 'enabled' : 'disabled'}`);
 * ```
 */
export async function toggleSchedule(workspaceId: string, scheduleId: string, active: boolean): Promise<Schedule> {
  return apiPut<Schedule>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, scheduleId), { active });
}
