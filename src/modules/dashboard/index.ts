/**
 * Dashboard module — workspace overview statistics, recent scans, and health status.
 *
 * @module dashboard
 *
 * @example
 * ```ts
 * import { useDashboardStatsQuery, useDashboardScansQuery } from '@/modules/dashboard';
 * import type { DashboardStats, DashboardScan } from '@/modules/dashboard';
 * ```
 */
export type { DashboardStats, DashboardScan, DashboardFinding, DashboardHealth } from './types';
export { dashboardKeys } from './keys';
export {
  useDashboardStatsQuery,
  useDashboardScansQuery,
  useDashboardFindingsQuery,
  useDashboardHealthQuery,
} from './queries';
