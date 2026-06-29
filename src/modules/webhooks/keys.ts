import type { ListParams } from '@/commons/types/pagination';

export const webhookKeys = {
  all: ['webhooks'] as const,
  list: (workspaceId: string, params?: ListParams) => [...webhookKeys.all, 'list', workspaceId, params] as const,
};
