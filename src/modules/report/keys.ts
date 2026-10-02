export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...reportKeys.lists(), workspaceId] as const,
};
