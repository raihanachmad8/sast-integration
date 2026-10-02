export const scanProfileKeys = {
  all: ['scan-profiles'] as const,
  list: (workspaceId: string) => [...scanProfileKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, id: string) => [...scanProfileKeys.all, 'detail', workspaceId, id] as const,
};
