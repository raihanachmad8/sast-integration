/**
 * Unit tests for knowledge source orchestration.
 *
 * Purpose: Verify sync actions use newly created default sources immediately instead of
 * waiting for a later query refresh.
 */
import { describe, expect, it, vi } from 'vitest';
import type { KnowledgeBaseSource } from '@/modules/knowledge-base/api';
import { ensureKnowledgeSource, prepareAndSyncKnowledgeSources } from '@/modules/knowledge-base/source-flow';

const WORKSPACE_ID = 'ws-test-123';

function source(overrides: Partial<KnowledgeBaseSource>): KnowledgeBaseSource {
  return {
    id: overrides.id ?? 'source-id',
    workspaceId: WORKSPACE_ID,
    name: overrides.name ?? 'CWE',
    type: overrides.type ?? 'cwe',
    url: overrides.url,
    status: overrides.status ?? 'disconnected',
    entryCount: overrides.entryCount ?? 0,
    lastSyncedAt: overrides.lastSyncedAt,
    createdAt: overrides.createdAt ?? '2026-06-04T00:00:00.000Z',
  };
}

describe('knowledge source flow', () => {
  it('should create missing default sources and sync the created source IDs in the same operation', async () => {
    /**
     * Purpose: Prevent a stale React Query snapshot from causing the first Sync all click
     * to create sources but skip synchronization.
     */
    const createdCwe = source({ id: 'created-cwe', name: 'CWE', type: 'cwe' });
    const createdNvd = source({ id: 'created-nvd', name: 'NVD', type: 'nvd' });
    const createSource = vi.fn()
      .mockResolvedValueOnce(createdCwe)
      .mockResolvedValueOnce(createdNvd);
    const syncSource = vi.fn().mockResolvedValue(undefined);

    const result = await prepareAndSyncKnowledgeSources(WORKSPACE_ID, [], {
      createSource,
      syncSource,
    });

    expect(createSource).toHaveBeenCalledWith(WORKSPACE_ID, { name: 'CWE', type: 'cwe' });
    expect(createSource).toHaveBeenCalledWith(WORKSPACE_ID, { name: 'NVD', type: 'nvd' });
    expect(syncSource).toHaveBeenNthCalledWith(1, WORKSPACE_ID, 'created-cwe');
    expect(syncSource).toHaveBeenNthCalledWith(2, WORKSPACE_ID, 'created-nvd');
    expect(result.syncedCount).toBe(2);
  });

  it('should reuse an existing source when creating a custom knowledge entry', async () => {
    /**
     * Purpose: Ensure custom rule creation can provide the sourceId required by the API
     * instead of submitting an incomplete payload.
     */
    const existing = source({ id: 'custom-source', name: 'Custom Rules', type: 'custom' });
    const createSource = vi.fn();

    const result = await ensureKnowledgeSource(WORKSPACE_ID, [existing], {
      name: 'Custom Rules',
      type: 'custom',
    }, {
      createSource,
    });

    expect(createSource).not.toHaveBeenCalled();
    expect(result.id).toBe('custom-source');
  });
});
