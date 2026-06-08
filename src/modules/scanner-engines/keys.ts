import type { ListParams } from '@/commons/types/pagination';

export const scannerEngineKeys = {
  all: ['scanner-engines'] as const,
  list: (params?: ListParams) => [...scannerEngineKeys.all, 'list', params] as const,
  detail: (id: string) => [...scannerEngineKeys.all, 'detail', id] as const,
  rules: (id: string) => [...scannerEngineKeys.all, 'rules', id] as const,
};
