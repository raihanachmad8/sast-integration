import type { ListParams } from '@/commons/types/pagination';

export const reportKeys = {
  all: ['reports'] as const,
  list: (params?: ListParams) => [...reportKeys.all, 'list', params] as const,
};
