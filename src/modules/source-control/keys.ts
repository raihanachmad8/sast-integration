export const sourceControlKeys = {
  all: ['source-controls'] as const,
  lists: () => [...sourceControlKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...sourceControlKeys.lists(), workspaceId] as const,
  repos: (workspaceId: string) => [...sourceControlKeys.all, 'repos', workspaceId] as const,
};
