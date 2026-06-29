import type { FindingListParams } from './types';

export const findingKeys = {
  all: ['findings'] as const,
  lists: () => [...findingKeys.all, 'list'] as const,
  list: (workspaceId: string, params?: Partial<FindingListParams>) =>
    [...findingKeys.all, 'list', workspaceId, params] as const,
  details: () => [...findingKeys.all, 'detail'] as const,
  detail: (id: string) => [...findingKeys.all, 'detail', id] as const,
};
