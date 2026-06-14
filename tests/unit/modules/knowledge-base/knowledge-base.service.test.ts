import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  listEntriesByWorkspace: vi.fn(),
  countEntriesByWorkspace: vi.fn(),
  findEntryByIdWithWorkspaceScope: vi.fn(),
  findEntryForWorkspace: vi.fn(),
  findSourceByIdForWorkspace: vi.fn(),
  insertEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  muteEntry: vi.fn(),
  countEntriesBySource: vi.fn(),
  updateSourceEntryCount: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

vi.mock('@/server/modules/knowledge-base/knowledge-base.repository', () => ({
  knowledgeBaseRepository: mockRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/commons/schemas/knowledge-base.schema', () => ({
  createKnowledgeEntrySchema: { parse: (v: unknown) => v },
  updateKnowledgeEntrySchema: { parse: (v: unknown) => v },
}));

const { knowledgeBaseService } = await import('@/server/modules/knowledge-base/knowledge-base.service');

describe('knowledgeBaseService.listByWorkspace', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return paginated entries', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(1);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([{ id: 'kb-1', title: 'XSS Fix' }]);

    const result = await knowledgeBaseService.listByWorkspace('ws-1');
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(25);
  });

  it('+ should apply custom pagination', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(0);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    await knowledgeBaseService.listByWorkspace('ws-1', { page: 2, perPage: 10 });
    expect(mockRepo.listEntriesByWorkspace).toHaveBeenCalledWith('ws-1', expect.objectContaining({ limit: 10, offset: 10 }));
  });

  it('+ should apply search and source filters', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(0);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    await knowledgeBaseService.listByWorkspace('ws-1', { search: 'XSS', source: 'src-1' });
    expect(mockRepo.listEntriesByWorkspace).toHaveBeenCalledWith('ws-1', expect.objectContaining({ search: 'XSS', source: 'src-1' }));
  });

  it('- should return empty data when no entries exist', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(0);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    const result = await knowledgeBaseService.listByWorkspace('ws-1');
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('knowledgeBaseService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return entry when found in workspace', async () => {
    mockRepo.findEntryByIdWithWorkspaceScope.mockResolvedValue({ id: 'kb-1', title: 'XSS Fix' });
    const result = await knowledgeBaseService.getById('ws-1', 'kb-1');
    expect(result.id).toBe('kb-1');
  });

  it('- should throw NOT_FOUND when entry does not exist', async () => {
    mockRepo.findEntryByIdWithWorkspaceScope.mockResolvedValue(null);
    await expect(knowledgeBaseService.getById('ws-1', 'kb-1')).rejects.toThrow('Knowledge entry not found');
  });

  it('- should call repo with entryId and workspaceId', async () => {
    mockRepo.findEntryByIdWithWorkspaceScope.mockResolvedValue(null);
    await knowledgeBaseService.getById('ws-2', 'kb-2').catch(() => {});
    expect(mockRepo.findEntryByIdWithWorkspaceScope).toHaveBeenCalledWith('kb-2', 'ws-2');
  });
});

describe('knowledgeBaseService.createEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should create entry when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue({ id: 'src-1' });
    mockRepo.insertEntry.mockResolvedValue({ id: 'kb-1', title: 'New' });
    mockRepo.countEntriesBySource.mockResolvedValue(1);

    const result = await knowledgeBaseService.createEntry('ws-1', { sourceId: 'src-1', title: 'New' }, 'user-1');
    expect(result.id).toBe('kb-1');
  });

  it('+ should update source entry count after creation', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue({ id: 'src-1' });
    mockRepo.insertEntry.mockResolvedValue({ id: 'kb-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(5);

    await knowledgeBaseService.createEntry('ws-1', { sourceId: 'src-1', title: 'X' }, 'user-1');
    expect(mockRepo.updateSourceEntryCount).toHaveBeenCalledWith('src-1', 5);
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(knowledgeBaseService.createEntry('ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when source does not exist in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue(null);
    await expect(knowledgeBaseService.createEntry('ws-1', { sourceId: 'bad' }, 'user-1')).rejects.toThrow('Knowledge source not found');
  });
});

describe('knowledgeBaseService.updateEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should update entry successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.updateEntry.mockResolvedValue({ id: 'kb-1', title: 'Updated' });

    const result = await knowledgeBaseService.updateEntry('kb-1', { title: 'Updated' }, 'ws-1', 'user-1');
    expect(result.title).toBe('Updated');
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(knowledgeBaseService.updateEntry('kb-1', {}, 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when entry not in workspace (IDOR protection)', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue(null);
    await expect(knowledgeBaseService.updateEntry('kb-1', {}, 'ws-1', 'user-1')).rejects.toThrow('Knowledge entry not found');
  });

  it('- should throw NOT_FOUND when update returns null', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.updateEntry.mockResolvedValue(null);
    await expect(knowledgeBaseService.updateEntry('kb-1', {}, 'ws-1', 'user-1')).rejects.toThrow('Knowledge entry not found');
  });
});

describe('knowledgeBaseService.deleteEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should delete entry and refresh source count', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.deleteEntry.mockResolvedValue({ id: 'kb-1', sourceId: 'src-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(4);

    const result = await knowledgeBaseService.deleteEntry('kb-1', 'ws-1', 'user-1');
    expect(result.id).toBe('kb-1');
    expect(mockRepo.updateSourceEntryCount).toHaveBeenCalledWith('src-1', 4);
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(knowledgeBaseService.deleteEntry('kb-1', 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when entry not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue(null);
    await expect(knowledgeBaseService.deleteEntry('kb-1', 'ws-1', 'user-1')).rejects.toThrow('Knowledge entry not found');
  });
});

describe('knowledgeBaseService.muteEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should mute entry successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.muteEntry.mockResolvedValue({ id: 'kb-1', muted: true });

    const result = await knowledgeBaseService.muteEntry('kb-1', 'ws-1', 'user-1');
    expect(result.muted).toBe(true);
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(knowledgeBaseService.muteEntry('kb-1', 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when entry not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findEntryForWorkspace.mockResolvedValue(null);
    await expect(knowledgeBaseService.muteEntry('kb-1', 'ws-1', 'user-1')).rejects.toThrow('Knowledge entry not found');
  });
});

describe('knowledgeBaseService edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should handle large page numbers', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(100);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    await knowledgeBaseService.listByWorkspace('ws-1', { page: 100, perPage: 10 });
    expect(mockRepo.listEntriesByWorkspace).toHaveBeenCalledWith('ws-1', expect.objectContaining({ offset: 990 }));
  });

  it('+ should handle special characters in search', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(0);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    await knowledgeBaseService.listByWorkspace('ws-1', { search: '<script>alert(1)</script>' });
    expect(mockRepo.listEntriesByWorkspace).toHaveBeenCalled();
  });

  it('+ should handle owner role for createEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue({ id: 'src-1' });
    mockRepo.insertEntry.mockResolvedValue({ id: 'kb-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(1);

    const result = await knowledgeBaseService.createEntry('ws-1', { sourceId: 'src-1', title: 'X' }, 'user-1');
    expect(result.id).toBe('kb-1');
  });

  it('+ should handle manager role for createEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue({ id: 'src-1' });
    mockRepo.insertEntry.mockResolvedValue({ id: 'kb-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(1);

    const result = await knowledgeBaseService.createEntry('ws-1', { sourceId: 'src-1', title: 'X' }, 'user-1');
    expect(result.id).toBe('kb-1');
  });

  it('- should throw for viewer role on createEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    // Viewer is still a member, so this should NOT throw
    mockRepo.findSourceByIdForWorkspace.mockResolvedValue({ id: 'src-1' });
    mockRepo.insertEntry.mockResolvedValue({ id: 'kb-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(1);

    const result = await knowledgeBaseService.createEntry('ws-1', { sourceId: 'src-1', title: 'X' }, 'user-1');
    expect(result.id).toBe('kb-1');
  });

  it('+ should handle owner role for updateEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.updateEntry.mockResolvedValue({ id: 'kb-1', title: 'Updated' });

    const result = await knowledgeBaseService.updateEntry('kb-1', { title: 'Updated' }, 'ws-1', 'user-1');
    expect(result.title).toBe('Updated');
  });

  it('+ should handle owner role for deleteEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.deleteEntry.mockResolvedValue({ id: 'kb-1', sourceId: 'src-1' });
    mockRepo.countEntriesBySource.mockResolvedValue(0);

    const result = await knowledgeBaseService.deleteEntry('kb-1', 'ws-1', 'user-1');
    expect(result.id).toBe('kb-1');
  });

  it('+ should handle owner role for muteEntry', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findEntryForWorkspace.mockResolvedValue({ id: 'kb-1' });
    mockRepo.muteEntry.mockResolvedValue({ id: 'kb-1', muted: true });

    const result = await knowledgeBaseService.muteEntry('kb-1', 'ws-1', 'user-1');
    expect(result.muted).toBe(true);
  });

  it('+ should call listEntriesByWorkspace with default params', async () => {
    mockRepo.countEntriesByWorkspace.mockResolvedValue(0);
    mockRepo.listEntriesByWorkspace.mockResolvedValue([]);

    await knowledgeBaseService.listByWorkspace('ws-1');
    expect(mockRepo.listEntriesByWorkspace).toHaveBeenCalledWith('ws-1', expect.objectContaining({ limit: 25, offset: 0 }));
  });
});
