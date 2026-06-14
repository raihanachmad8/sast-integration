export const knowledgeKeys = {
  all: ['knowledge'] as const,
  workspace: (workspaceId: string) => [...knowledgeKeys.all, workspaceId] as const,
  sources: (workspaceId: string) => [...knowledgeKeys.workspace(workspaceId), 'sources'] as const,
  entries: (workspaceId: string) => [...knowledgeKeys.workspace(workspaceId), 'entries'] as const,
  sourceEntries: (workspaceId: string, sourceId: string) => [...knowledgeKeys.workspace(workspaceId), 'entries', sourceId] as const,
  backfill: (workspaceId: string, sourceId: string) => [...knowledgeKeys.workspace(workspaceId), 'backfill', sourceId] as const,
};
