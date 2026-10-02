export const modelKeys = {
  all: ['model'] as const,
  lists: () => [...modelKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...modelKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, id: string) => [...modelKeys.all, 'detail', workspaceId, id] as const,
};
