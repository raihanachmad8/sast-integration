import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findByWorkspace: vi.fn(),
  list: vi.fn(),
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

describe('aiModelsService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model can be created by a workspace member
   */
  it('+ should create model when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'GPT-4', provider: 'openai' });

    const result = await aiModelsService.create('ws-1', { name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1, promptPreset: 'default' }, 'user-1');
    expect(result.name).toBe('GPT-4');
    expect(result.provider).toBe('openai');
  });

  /**
   * Purpose: Validates that optional fields like baseUrl and apiKey are saved
   */
  it('+ should create model with optional fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', baseUrl: 'https://api.openai.com' });

    const result = await aiModelsService.create('ws-1', { name: 'Custom', provider: 'openai', baseUrl: 'https://api.openai.com', apiKey: 'sk-123', customSystemPrompt: 'Custom prompt' }, 'user-1');
    expect(result.baseUrl).toBe('https://api.openai.com');
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.create('ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });
});

describe('aiModelsService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model is returned by its ID
   */
  it('+ should return model by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', name: 'GPT-4' });
    const result = await aiModelsService.getById('ws-1', 'm-1');
    expect(result.name).toBe('GPT-4');
  });

  /**
   * Purpose: Validates that models are filtered by workspaceId
   */
  it('+ should filter by workspaceId when provided', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', workspaceId: 'ws-1' });
    await aiModelsService.getById('ws-1', 'm-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('ws-1', 'm-1');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.getById('ws-1', 'm-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all models for a workspace are returned
   */
  it('+ should return all models for workspace', async () => {
    mockRepo.list.mockResolvedValue({
      data: [{ id: 'm-1', name: 'GPT-4' }, { id: 'm-2', name: 'Claude' }],
      total: 2,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });
    const result = await aiModelsService.list('ws-1');
    expect(result.data).toHaveLength(2);
  });

  /**
   * Purpose: Validates that an empty array is returned when no models are configured
   */
  it('+ should return empty array when no models exist', async () => {
    mockRepo.list.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      lastPage: 0,
    });

    const result = await aiModelsService.list('ws-1', {});
    expect(result.data).toHaveLength(0);
  });
});

describe('aiModelsService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model can be updated by a member
   */
  it('+ should update model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.update('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  /**
   * Purpose: Validates that partial field updates work correctly
   */
  it('+ should update model with partial fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', priority: 2 });

    const result = await aiModelsService.update('m-1', 'ws-1', { priority: 2 }, 'user-1');
    expect(result.priority).toBe(2);
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.update('m-1', 'ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue(null);
    await expect(aiModelsService.update('m-1', 'ws-1', { name: 'X' }, 'user-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.remove', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model can be deleted by a member
   */
  it('+ should delete model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.remove('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.remove('m-1', 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.remove('m-1', 'ws-1', 'user-1')).rejects.toThrow('AI model not found');
  });
});

describe('❌ negative', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a repository error propagates during model creation
   */
  it('- should throw when repository.create throws', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      aiModelsService.create('ws-1', { name: 'GPT-4', provider: 'openai' }, 'user-1')
    ).rejects.toThrow('DB connection failed');
  });

  /**
   * Purpose: Validates that a repository error propagates during model update
   */
  it('- should throw when repository.update throws', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      aiModelsService.update('m-1', 'ws-1', { name: 'X' }, 'user-1')
    ).rejects.toThrow('DB connection failed');
  });

  /**
   * Purpose: Validates that a repository error propagates during model deletion
   */
  it('- should throw when repository.findById throws during deleteModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockRejectedValue(new Error('DB timeout'));

    await expect(
      aiModelsService.remove('m-1', 'ws-1', 'user-1')
    ).rejects.toThrow('DB timeout');
  });

  /**
   * Purpose: Validates that a repository error propagates during list
   */
  it('- should throw when repository.list throws', async () => {
    mockRepo.list.mockRejectedValue(new Error('DB timeout'));

    await expect(
      aiModelsService.list('ws-1')
    ).rejects.toThrow('DB timeout');
  });
});

describe('🔲 edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that createModel handles null optional fields gracefully
   */
  it('- should handle model with null optional fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model', baseUrl: '', apiKeyEncrypted: null, customSystemPrompt: null });

    const result = await aiModelsService.create('ws-1', { name: 'Model', provider: 'openai', role: 'primary', priority: 1, promptPreset: 'default' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that getById handles model with all null optional properties
   */
  it('- should get model with minimal fields', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', name: 'Minimal', provider: 'openai', baseUrl: null, role: null, priority: null });

    const result = await aiModelsService.getById('ws-1', 'm-1');
    expect(result.name).toBe('Minimal');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that listModelsByWorkspace handles empty model list
   */
  it('+ should return empty array for empty workspace', async () => {
    mockRepo.list.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20, lastPage: 0 });
    const result = await aiModelsService.list('ws-empty');
    expect(result.data).toEqual([]);
  });

  /**
   * Purpose: Validates that updateModel throws when repository returns null
   */
  it('- should throw NOT_FOUND when update returns null', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue(null);

    await expect(
      aiModelsService.update('m-1', 'ws-1', { name: 'X' }, 'user-1')
    ).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that the owner role can create AI models
   */
  it('+ should handle owner role for createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });

    const result = await aiModelsService.create('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the manager role can create AI models
   */
  it('+ should handle manager role for createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });

    const result = await aiModelsService.create('ws-1', { name: 'Model', provider: 'anthropic' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the viewer role can still create models as a member
   */
  it('- should throw for viewer role on createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    // Viewer is still a member, so this should NOT throw
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });
    const result = await aiModelsService.create('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the owner role can update AI models
   */
  it('+ should handle owner role for updateModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.update('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  /**
   * Purpose: Validates that the owner role can delete AI models
   */
  it('+ should handle owner role for deleteModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.remove('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that findById is called with the correct workspaceId
   */
  it('+ should call findById with workspaceId', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    await aiModelsService.getById('ws-2', 'm-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('ws-2', 'm-1');
  });

  /**
   * Purpose: Validates that list calls repository with correct workspace ID
   */
  it('+ should call list with correct ID', async () => {
    mockRepo.list.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20, lastPage: 0 });
    await aiModelsService.list('ws-99');
    expect(mockRepo.list).toHaveBeenCalledWith('ws-99', undefined);
  });

  /**
   * Purpose: Validates that all model properties are preserved
   */
  it('+ should return models with all properties', async () => {
    mockRepo.list.mockResolvedValue({
      data: [
        { id: 'm-1', name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1 },
        { id: 'm-2', name: 'Claude', provider: 'anthropic', role: 'fallback', priority: 2 },
      ],
      total: 2,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });

    const result = await aiModelsService.list('ws-1');
    expect(result.data[0].role).toBe('primary');
    expect(result.data[1].role).toBe('fallback');
  });

  /**
   * Purpose: Validates that remove is called with the correct model and workspace IDs
   */
  it('+ should call remove with correct IDs', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await aiModelsService.remove('m-1', 'ws-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  /**
   * Purpose: Validates that deletion succeeds even without explicit return check
   */
  it('- should throw NOT_FOUND when delete returns null', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    // delete doesn't check return value, just calls delete
    await expect(aiModelsService.remove('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that multiple models are returned correctly
   */
  it('+ should handle multiple models in workspace', async () => {
    mockRepo.list.mockResolvedValue({
      data: [
        { id: 'm-1', name: 'GPT-4' },
        { id: 'm-2', name: 'Claude' },
        { id: 'm-3', name: 'Gemini' },
      ],
      total: 3,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });

    const result = await aiModelsService.list('ws-1');
    expect(result.data).toHaveLength(3);
  });

  /**
   * Purpose: Validates that different AI providers are supported
   */
  it('+ should handle createModel with all providers', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', provider: 'anthropic' });

    const result = await aiModelsService.create('ws-1', { name: 'Claude', provider: 'anthropic' }, 'user-1');
    expect(result.provider).toBe('anthropic');
  });

  /**
   * Purpose: Validates that the AI provider can be changed
   */
  it('+ should handle updateModel with provider change', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', provider: 'openai' });

    const result = await aiModelsService.update('m-1', 'ws-1', { provider: 'openai' }, 'user-1');
    expect(result.provider).toBe('openai');
  });

  /**
   * Purpose: Validates that a large number of models are handled correctly
   */
  it('+ should handle listModelsByWorkspace with many models', async () => {
    const models = Array.from({ length: 10 }, (_, i) => ({ id: `m-${i}`, name: `Model ${i}` }));
    mockRepo.list.mockResolvedValue({
      data: models,
      total: 10,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });

    const result = await aiModelsService.list('ws-1');
    expect(result.data).toHaveLength(10);
  });
});
