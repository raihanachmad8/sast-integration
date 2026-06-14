import type { ListParams } from '@/commons/types/pagination';

export const qualityGateKeys = {
  all: ['quality-gates'] as const,
  list: (params?: ListParams) => [...qualityGateKeys.all, 'list', params] as const,
  config: () => [...qualityGateKeys.all, 'config'] as const,
  results: () => [...qualityGateKeys.all, 'results'] as const,
};
