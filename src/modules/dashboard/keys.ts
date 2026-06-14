/**
 * TanStack Query key factory for the dashboard module.
 *
 * All keys are workspace-scoped since dashboard data is per-workspace.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: dashboardKeys.stats('ws_01') });
 * queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
 * ```
 */
export const dashboardKeys = {
  /** Root key — invalidates all dashboard queries. */
  all: ['dashboard'] as const,
  /** Key for dashboard summary stats. */
  stats: (workspaceId: string) => [...dashboardKeys.all, 'stats', workspaceId] as const,
  /** Key for recent scans. */
  scans: (workspaceId: string) => [...dashboardKeys.all, 'scans', workspaceId] as const,
  /** Key for attention-required findings. */
  findings: (workspaceId: string) => [...dashboardKeys.all, 'findings', workspaceId] as const,
  /** Key for workspace health status. */
  health: (workspaceId: string) => [...dashboardKeys.all, 'health', workspaceId] as const,
};
