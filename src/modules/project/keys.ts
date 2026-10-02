export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (query: unknown) => [...projectKeys.lists(), query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  apiTokens: (projectId: string) => [...projectKeys.all, 'api-tokens', projectId] as const,
};
