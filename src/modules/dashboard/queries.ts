'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from './keys';
import { getDashboardStats, getDashboardScans, getDashboardFindings, getDashboardHealth } from './api';

export function useDashboardStatsQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: () => getDashboardStats(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useDashboardScansQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.scans(workspaceId),
    queryFn: () => getDashboardScans(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useDashboardFindingsQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.findings(workspaceId),
    queryFn: () => getDashboardFindings(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useDashboardHealthQuery(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.health(workspaceId),
    queryFn: () => getDashboardHealth(workspaceId),
    enabled: workspaceId.length > 0,
  });
}
