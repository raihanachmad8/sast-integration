import type { ListParams } from '@/commons/types/pagination';

export const webhookKeys = {
  all: ['webhooks'] as const,
  list: (params?: ListParams) => [...webhookKeys.all, 'list', params] as const,
};
