import type { ListParams } from '@/commons/types/pagination';

export const scanProfileKeys = {
  all: ['scan-profiles'] as const,
  list: (params?: ListParams) => [...scanProfileKeys.all, 'list', params] as const,
};
