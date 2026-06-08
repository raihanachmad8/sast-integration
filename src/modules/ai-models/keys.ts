import type { ListParams } from '@/commons/types/pagination';

export const aiModelKeys = {
  all: ['ai-models'] as const,
  list: (params?: ListParams) => [...aiModelKeys.all, 'list', params] as const,
};
