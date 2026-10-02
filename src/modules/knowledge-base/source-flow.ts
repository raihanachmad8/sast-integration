import {
  createKnowledgeSource,
  syncKnowledgeSourceById,
  type KnowledgeBaseSource,
} from './api';

type SourceInput = {
  name: string;
  type: string;
};

type SourceFlowDeps = {
  createSource?: typeof createKnowledgeSource;
  syncSource?: typeof syncKnowledgeSourceById;
};

export const DEFAULT_KNOWLEDGE_SOURCES: SourceInput[] = [
  { name: 'CWE', type: 'cwe' },
  { name: 'NVD', type: 'nvd' },
];

/**
 * Returns an existing source for the requested type or creates it immediately.
 *
 * @throws {ApiRequestError} When the API request fails.
 */
export async function ensureKnowledgeSource(
  workspaceId: string,
  sources: KnowledgeBaseSource[],
  input: SourceInput,
  deps: Pick<SourceFlowDeps, 'createSource'> = {},
): Promise<KnowledgeBaseSource> {
  const existing = sources.find((source) => source.type === input.type);
  if (existing) return existing;

  const createSourceFn = deps.createSource ?? createKnowledgeSource;
  return createSourceFn(workspaceId, input);
}

/**
 * Ensures default knowledge sources exist, then syncs the current source IDs.
 *
 * @throws {ApiRequestError} When source creation or synchronization fails.
 */
export async function prepareAndSyncKnowledgeSources(
  workspaceId: string,
  sources: KnowledgeBaseSource[],
  deps: SourceFlowDeps = {},
): Promise<{ sources: KnowledgeBaseSource[]; syncedCount: number }> {
  const createSourceFn = deps.createSource ?? createKnowledgeSource;
  const syncSourceFn = deps.syncSource ?? syncKnowledgeSourceById;
  const nextSources = [...sources];

  for (const sourceInput of DEFAULT_KNOWLEDGE_SOURCES) {
    if (!nextSources.some((source) => source.type === sourceInput.type)) {
      const created = await createSourceFn(workspaceId, sourceInput);
      nextSources.push(created);
    }
  }

  for (const source of nextSources) {
    await syncSourceFn(workspaceId, source.id);
  }

  return { sources: nextSources, syncedCount: nextSources.length };
}
