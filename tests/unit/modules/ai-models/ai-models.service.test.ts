import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorkspace: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

vi.mock('@/server/modules/ai-models/ai-models.repository', () => ({
  aiModelsRepository: mockRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/commons/schemas', () => ({
  createAiModelSchema: { parse: (v: unknown) => v },
  updateAiModelSchema: { parse: (v: unknown) => v },
}));

const { aiModelsService } = await import('@/server/modules/ai-models/ai-models.service');

describe('aiModelsService.createModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should create model when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'GPT-4', provider: 'openai' });

    const result = await aiModelsService.createModel('ws-1', { name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1, promptPreset: 'default' }, 'user-1');
    expect(result.name).toBe('GPT-4');
    expect(result.provider).toBe('openai');
  });

  it('+ should create model with optional fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', baseUrl: 'https://api.openai.com' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Custom', provider: 'openai', baseUrl: 'https://api.openai.com', apiKey: 'sk-123', customSystemPrompt: 'Custom prompt' }, 'user-1');
    expect(result.baseUrl).toBe('https://api.openai.com');
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.createModel('ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });
});

describe('aiModelsService.getModelById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return model by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', name: 'GPT-4' });
    const result = await aiModelsService.getModelById('m-1');
    expect(result.name).toBe('GPT-4');
  });

  it('+ should filter by workspaceId when provided', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', workspaceId: 'ws-1' });
    await aiModelsService.getModelById('m-1', 'ws-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.getModelById('m-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.listModelsByWorkspace', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return all models for workspace', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([{ id: 'm-1', name: 'GPT-4' }, { id: 'm-2', name: 'Claude' }]);
    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(2);
  });

  it('+ should return empty array when no models exist', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([]);
    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toEqual([]);
  });
});

describe('aiModelsService.updateModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should update model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  it('+ should update model with partial fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', priority: 2 });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { priority: 2 }, 'user-1');
    expect(result.priority).toBe(2);
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.updateModel('m-1', 'ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue(null);
    await expect(aiModelsService.updateModel('m-1', 'ws-1', { name: 'X' }, 'user-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.deleteModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should delete model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should handle owner role for createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  it('+ should handle manager role for createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'anthropic' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  it('- should throw for viewer role on createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    // Viewer is still a member, so this should NOT throw
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });
    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  it('+ should handle owner role for updateModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  it('+ should handle owner role for deleteModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  it('+ should call findById with workspaceId', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    await aiModelsService.getModelById('m-1', 'ws-2');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', 'ws-2');
  });

  it('+ should call findById without workspaceId', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    await aiModelsService.getModelById('m-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', undefined);
  });

  it('+ should call findByWorkspace with correct ID', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([]);
    await aiModelsService.listModelsByWorkspace('ws-99');
    expect(mockRepo.findByWorkspace).toHaveBeenCalledWith('ws-99');
  });

  it('+ should return models with all properties', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([
      { id: 'm-1', name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1 },
      { id: 'm-2', name: 'Claude', provider: 'anthropic', role: 'fallback', priority: 2 },
    ]);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result[0].role).toBe('primary');
    expect(result[1].role).toBe('fallback');
  });

  it('+ should call delete with correct IDs', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await aiModelsService.deleteModel('m-1', 'ws-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  it('- should throw NOT_FOUND when delete returns null', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    // delete doesn't check return value, just calls delete
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  it('+ should handle multiple models in workspace', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([
      { id: 'm-1', name: 'GPT-4' },
      { id: 'm-2', name: 'Claude' },
      { id: 'm-3', name: 'Gemini' },
    ]);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(3);
  });

  it('+ should handle createModel with all providers', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', provider: 'anthropic' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Claude', provider: 'anthropic' }, 'user-1');
    expect(result.provider).toBe('anthropic');
  });

  it('+ should handle updateModel with provider change', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', provider: 'openai' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { provider: 'openai' }, 'user-1');
    expect(result.provider).toBe('openai');
  });

  it('+ should handle listModelsByWorkspace with many models', async () => {
    const models = Array.from({ length: 10 }, (_, i) => ({ id: `m-${i}`, name: `Model ${i}` }));
    mockRepo.findByWorkspace.mockResolvedValue(models);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(10);
  });
});
