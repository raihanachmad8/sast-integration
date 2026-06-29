import type { ListParams } from '@/commons/types/pagination';

export const repositoryKeys = {
  all: ['repositories'] as const,
  list: (params?: ListParams) => [...repositoryKeys.all, 'list', params] as const,
  sourceControls: () => [...repositoryKeys.all, 'sourceControls'] as const,
  branches: (repoId: string) => [...repositoryKeys.all, 'branches', repoId] as const,
};
