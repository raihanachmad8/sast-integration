export const knowledgeBaseKeys = {
  all: ['knowledge-base'] as const,
  lists: () => [...knowledgeBaseKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...knowledgeBaseKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, entryId: string) => [...knowledgeBaseKeys.all, 'detail', workspaceId, entryId] as const,
};

export const knowledgeSourceKeys = {
  all: ['knowledge-sources'] as const,
  lists: () => [...knowledgeSourceKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...knowledgeSourceKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, sourceId: string) => [...knowledgeSourceKeys.all, 'detail', workspaceId, sourceId] as const,
  backfill: (workspaceId: string, sourceId: string) => [...knowledgeSourceKeys.all, 'backfill', workspaceId, sourceId] as const,
};
