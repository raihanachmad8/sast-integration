export const memberKeys = {
  all: ['members'] as const,
  list: (workspaceId: string) => [...memberKeys.all, 'list', workspaceId] as const,
  invitations: (workspaceId: string) => [...memberKeys.all, 'invitations', workspaceId] as const,
};
