export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (workspaceId: string) => [...dashboardKeys.all, 'stats', workspaceId] as const,
  scans: (workspaceId: string) => [...dashboardKeys.all, 'scans', workspaceId] as const,
  findings: (workspaceId: string) => [...dashboardKeys.all, 'findings', workspaceId] as const,
  health: (workspaceId: string) => [...dashboardKeys.all, 'health', workspaceId] as const,
};
