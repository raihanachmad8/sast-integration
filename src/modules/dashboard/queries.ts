'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from './keys';
import { dashboardApi } from './api';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching dashboard summary statistics.
 * @param workspaceId - The workspace ID. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: stats } = useDashboardStatsQuery('ws_01');
 * console.log(stats?.criticalFindings);
 * ```
 */
export function useDashboardStatsQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: () => dashboardApi.getStats(workspaceId),
    enabled: workspaceId.length > 0,
    staleTime: STALE.SHORT,
  });
}

/**
 * Query hook for fetching recent scans for the dashboard table.
 * @param workspaceId - The workspace ID. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: scans } = useDashboardScansQuery('ws_01');
 * ```
 */
export function useDashboardScansQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.scans(workspaceId),
    queryFn: () => dashboardApi.getScans(workspaceId),
    enabled: workspaceId.length > 0,
    staleTime: STALE.SHORT,
  });
}

/**
 * Query hook for fetching attention-required findings.
 * @param workspaceId - The workspace ID. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: findings } = useDashboardFindingsQuery('ws_01');
 * ```
 */
export function useDashboardFindingsQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.findings(workspaceId),
    queryFn: () => dashboardApi.getFindings(workspaceId),
    enabled: workspaceId.length > 0,
    staleTime: STALE.SHORT,
  });
}

/**
 * Query hook for fetching workspace health status.
 * @param workspaceId - The workspace ID. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: health } = useDashboardHealthQuery('ws_01');
 * ```
 */
export function useDashboardHealthQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.health(workspaceId),
    queryFn: () => dashboardApi.getHealth(workspaceId),
    enabled: workspaceId.length > 0,
    staleTime: STALE.SHORT,
  });
}
