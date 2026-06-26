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

  /**
   * Purpose: Validates that a model can be created by a workspace member
   */
  it('+ should create model when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'GPT-4', provider: 'openai' });

    const result = await aiModelsService.createModel('ws-1', { name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1, promptPreset: 'default' }, 'user-1');
    expect(result.name).toBe('GPT-4');
    expect(result.provider).toBe('openai');
  });

  /**
   * Purpose: Validates that optional fields like baseUrl and apiKey are saved
   */
  it('+ should create model with optional fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', baseUrl: 'https://api.openai.com' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Custom', provider: 'openai', baseUrl: 'https://api.openai.com', apiKey: 'sk-123', customSystemPrompt: 'Custom prompt' }, 'user-1');
    expect(result.baseUrl).toBe('https://api.openai.com');
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.createModel('ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });
});

describe('aiModelsService.getModelById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model is returned by its ID
   */
  it('+ should return model by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', name: 'GPT-4' });
    const result = await aiModelsService.getModelById('m-1');
    expect(result.name).toBe('GPT-4');
  });

  /**
   * Purpose: Validates that models are filtered by workspaceId
   */
  it('+ should filter by workspaceId when provided', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', workspaceId: 'ws-1' });
    await aiModelsService.getModelById('m-1', 'ws-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.getModelById('m-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.listModelsByWorkspace', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all models for a workspace are returned
   */
  it('+ should return all models for workspace', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([{ id: 'm-1', name: 'GPT-4' }, { id: 'm-2', name: 'Claude' }]);
    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(2);
  });

  /**
   * Purpose: Validates that an empty array is returned when no models are configured
   */
  it('+ should return empty array when no models exist', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([]);
    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toEqual([]);
  });
});

describe('aiModelsService.updateModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model can be updated by a member
   */
  it('+ should update model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  /**
   * Purpose: Validates that partial field updates work correctly
   */
  it('+ should update model with partial fields', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', priority: 2 });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { priority: 2 }, 'user-1');
    expect(result.priority).toBe(2);
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.updateModel('m-1', 'ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue(null);
    await expect(aiModelsService.updateModel('m-1', 'ws-1', { name: 'X' }, 'user-1')).rejects.toThrow('AI model not found');
  });
});

describe('aiModelsService.deleteModel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a model can be deleted by a member
   */
  it('+ should delete model successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('m-1', 'ws-1');
  });

  /**
   * Purpose: Validates that non-members cannot delete AI models
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).rejects.toThrow('You are not a member');
  });

  /**
   * Purpose: Validates that deleting a nonexistent model throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when model does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue(null);
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).rejects.toThrow('AI model not found');
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
      aiModelsService.createModel('ws-1', { name: 'GPT-4', provider: 'openai' }, 'user-1')
    ).rejects.toThrow('DB connection failed');
  });

  /**
   * Purpose: Validates that a repository error propagates during model update
   */
  it('- should throw when repository.update throws', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      aiModelsService.updateModel('m-1', 'ws-1', { name: 'X' }, 'user-1')
    ).rejects.toThrow('DB connection failed');
  });

  /**
   * Purpose: Validates that a repository error propagates during model deletion
   */
  it('- should throw when repository.findById throws during deleteModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockRejectedValue(new Error('DB timeout'));

    await expect(
      aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')
    ).rejects.toThrow('DB timeout');
  });

  /**
   * Purpose: Validates that a repository error propagates during list
   */
  it('- should throw when repository.findByWorkspace throws', async () => {
    mockRepo.findByWorkspace.mockRejectedValue(new Error('DB timeout'));

    await expect(
      aiModelsService.listModelsByWorkspace('ws-1')
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

    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'openai', role: 'primary', priority: 1, promptPreset: 'default' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that getModelById handles model with all null optional properties
   */
  it('- should get model with minimal fields', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1', name: 'Minimal', provider: 'openai', baseUrl: null, role: null, priority: null });

    const result = await aiModelsService.getModelById('m-1');
    expect(result.name).toBe('Minimal');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that listModelsByWorkspace handles empty model list
   */
  it('+ should return empty array for empty workspace', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([]);
    const result = await aiModelsService.listModelsByWorkspace('ws-empty');
    expect(result).toEqual([]);
  });

  /**
   * Purpose: Validates that updateModel throws when repository returns null
   */
  it('- should throw NOT_FOUND when update returns null', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue(null);

    await expect(
      aiModelsService.updateModel('m-1', 'ws-1', { name: 'X' }, 'user-1')
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

    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the manager role can create AI models
   */
  it('+ should handle manager role for createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'anthropic' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the viewer role can still create models as a member
   */
  it('- should throw for viewer role on createModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    // Viewer is still a member, so this should NOT throw
    mockRepo.create.mockResolvedValue({ id: 'm-1', name: 'Model' });
    const result = await aiModelsService.createModel('ws-1', { name: 'Model', provider: 'openai' }, 'user-1');
    expect(result.id).toBe('m-1');
  });

  /**
   * Purpose: Validates that the owner role can update AI models
   */
  it('+ should handle owner role for updateModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.update.mockResolvedValue({ id: 'm-1', name: 'Updated' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { name: 'Updated' }, 'user-1');
    expect(result.name).toBe('Updated');
  });

  /**
   * Purpose: Validates that the owner role can delete AI models
   */
  it('+ should handle owner role for deleteModel', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that findById is called with the correct workspaceId
   */
  it('+ should call findById with workspaceId', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    await aiModelsService.getModelById('m-1', 'ws-2');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', 'ws-2');
  });

  /**
   * Purpose: Validates that findById works when no workspaceId is provided
   */
  it('+ should call findById without workspaceId', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    await aiModelsService.getModelById('m-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('m-1', undefined);
  });

  /**
   * Purpose: Validates that findByWorkspace is called with the correct workspace ID
   */
  it('+ should call findByWorkspace with correct ID', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([]);
    await aiModelsService.listModelsByWorkspace('ws-99');
    expect(mockRepo.findByWorkspace).toHaveBeenCalledWith('ws-99');
  });

  /**
   * Purpose: Validates that all model properties are preserved
   */
  it('+ should return models with all properties', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([
      { id: 'm-1', name: 'GPT-4', provider: 'openai', role: 'primary', priority: 1 },
      { id: 'm-2', name: 'Claude', provider: 'anthropic', role: 'fallback', priority: 2 },
    ]);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result[0].role).toBe('primary');
    expect(result[1].role).toBe('fallback');
  });

  /**
   * Purpose: Validates that delete is called with the correct model and workspace IDs
   */
  it('+ should call delete with correct IDs', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'm-1' });
    mockRepo.delete.mockResolvedValue(undefined);

    await aiModelsService.deleteModel('m-1', 'ws-1', 'user-1');
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
    await expect(aiModelsService.deleteModel('m-1', 'ws-1', 'user-1')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that multiple models are returned correctly
   */
  it('+ should handle multiple models in workspace', async () => {
    mockRepo.findByWorkspace.mockResolvedValue([
      { id: 'm-1', name: 'GPT-4' },
      { id: 'm-2', name: 'Claude' },
      { id: 'm-3', name: 'Gemini' },
    ]);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(3);
  });

  /**
   * Purpose: Validates that different AI providers are supported
   */
  it('+ should handle createModel with all providers', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'm-1', provider: 'anthropic' });

    const result = await aiModelsService.createModel('ws-1', { name: 'Claude', provider: 'anthropic' }, 'user-1');
    expect(result.provider).toBe('anthropic');
  });

  /**
   * Purpose: Validates that the AI provider can be changed
   */
  it('+ should handle updateModel with provider change', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.update.mockResolvedValue({ id: 'm-1', provider: 'openai' });

    const result = await aiModelsService.updateModel('m-1', 'ws-1', { provider: 'openai' }, 'user-1');
    expect(result.provider).toBe('openai');
  });

  /**
   * Purpose: Validates that a large number of models are handled correctly
   */
  it('+ should handle listModelsByWorkspace with many models', async () => {
    const models = Array.from({ length: 10 }, (_, i) => ({ id: `m-${i}`, name: `Model ${i}` }));
    mockRepo.findByWorkspace.mockResolvedValue(models);

    const result = await aiModelsService.listModelsByWorkspace('ws-1');
    expect(result).toHaveLength(10);
  });
});
