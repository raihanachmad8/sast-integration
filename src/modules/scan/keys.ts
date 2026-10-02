export const scanKeys = {
  all: ['scans'] as const,
  lists: () => [...scanKeys.all, 'list'] as const,
  list: (query: unknown) => [...scanKeys.lists(), query] as const,
  details: () => [...scanKeys.all, 'detail'] as const,
  detail: (id: string) => [...scanKeys.details(), id] as const,
  repositoryScans: (workspaceId: string, projectId: string, repositoryId: string) =>
    [...scanKeys.all, 'repository', workspaceId, projectId, repositoryId] as const,
  projects: (workspaceId: string) => [...scanKeys.all, 'projects', workspaceId] as const,
  repositories: (workspaceId: string, projectId: string) =>
    [...scanKeys.all, 'repositories', workspaceId, projectId] as const,
  profiles: (workspaceId: string) => [...scanKeys.all, 'profiles', workspaceId] as const,
};
