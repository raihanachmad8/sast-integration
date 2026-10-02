export const findingKeys = {
  all: ['findings'] as const,
  lists: () => [...findingKeys.all, 'list'] as const,
  list: (query: unknown) => [...findingKeys.lists(), query] as const,
  details: () => [...findingKeys.all, 'detail'] as const,
  detail: (id: string) => [...findingKeys.details(), id] as const,
};
