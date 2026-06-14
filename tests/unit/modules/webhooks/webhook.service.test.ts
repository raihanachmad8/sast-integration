import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  logDelivery: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

vi.mock('@/server/modules/webhooks/webhook.repository', () => ({
  webhookRepository: mockRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/server/http/errors', () => ({
  AppError: class AppError extends Error {
    constructor(message: string, public status: number, public code: string) {
      super(message);
    }
  },
  validateSchema: (schema: { parse: (v: unknown) => unknown }, data: unknown) => schema.parse(data),
}));

vi.mock('@/commons/schemas', () => ({
  createWebhookSchema: { parse: (v: unknown) => v },
  updateWebhookSchema: { parse: (v: unknown) => v },
}));

vi.mock('@/server/lib/ssrf', () => ({
  isPrivateOrInternal: () => false,
}));

const { webhookService } = await import('@/server/modules/webhooks/webhook.service');

describe('webhookService.createWebhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should create webhook when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', name: 'Slack', url: 'https://hooks.slack.com/...' });

    const result = await webhookService.createWebhook('ws-1', { name: 'Slack', url: 'https://hooks.slack.com/...', events: ['scan.completed'] }, 'user-1');
    expect(result.name).toBe('Slack');
  });

  it('+ should create webhook with default active=true', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', active: true });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed'] }, 'user-1');
    expect(result.active).toBe(true);
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(webhookService.createWebhook('ws-1', {}, 'user-1')).rejects.toThrow('You are not a member');
  });
});

describe('webhookService.getWebhookById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return webhook by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'wh-1', name: 'Slack', url: 'https://hooks.slack.com/...' });
    const result = await webhookService.getWebhookById('wh-1');
    expect(result.name).toBe('Slack');
  });

  it('- should throw NOT_FOUND when webhook does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(webhookService.getWebhookById('wh-1')).rejects.toThrow('Webhook not found');
  });
});

describe('webhookService.listWebhooksByWorkspace', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return webhooks for workspace', async () => {
    mockRepo.listByWorkspace.mockResolvedValue([{ id: 'wh-1', name: 'Slack' }, { id: 'wh-2', name: 'Teams' }]);
    const result = await webhookService.listWebhooksByWorkspace('ws-1');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Slack');
  });

  it('+ should return empty array when no webhooks exist', async () => {
    mockRepo.listByWorkspace.mockResolvedValue([]);
    const result = await webhookService.listWebhooksByWorkspace('ws-1');
    expect(result).toEqual([]);
  });
});

describe('webhookService.updateWebhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should update webhook successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1' });
    mockRepo.update.mockResolvedValue({ id: 'wh-1', name: 'Updated' });

    const result = await webhookService.updateWebhook('wh-1', { name: 'Updated' }, 'user-1', 'ws-1');
    expect(result.name).toBe('Updated');
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(webhookService.updateWebhook('wh-1', {}, 'user-1', 'ws-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when webhook does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue(null);
    await expect(webhookService.updateWebhook('wh-1', {}, 'user-1', 'ws-1')).rejects.toThrow('Webhook not found');
  });
});

describe('webhookService.deleteWebhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should soft delete webhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1', name: 'Slack' });
    mockRepo.softDelete.mockResolvedValue(undefined);

    const result = await webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1');
    expect(result.id).toBe('wh-1');
    expect(result.name).toBe('Slack');
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1')).rejects.toThrow('You are not a member');
  });

  it('- should throw NOT_FOUND when webhook does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue(null);
    await expect(webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1')).rejects.toThrow('Webhook not found');
  });
});

describe('webhookService edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should handle owner role for createWebhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', name: 'Hook' });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed'] }, 'user-1');
    expect(result.id).toBe('wh-1');
  });

  it('+ should handle manager role for createWebhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', name: 'Hook' });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed'] }, 'user-1');
    expect(result.id).toBe('wh-1');
  });

  it('- should throw for viewer role on createWebhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    // Viewer is still a member, so this should NOT throw
    mockRepo.create.mockResolvedValue({ id: 'wh-1', name: 'Hook' });
    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed'] }, 'user-1');
    expect(result.id).toBe('wh-1');
  });

  it('+ should handle owner role for updateWebhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1' });
    mockRepo.update.mockResolvedValue({ id: 'wh-1', name: 'Updated' });

    const result = await webhookService.updateWebhook('wh-1', { name: 'Updated' }, 'user-1', 'ws-1');
    expect(result.name).toBe('Updated');
  });

  it('+ should handle owner role for deleteWebhook', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1', name: 'Hook' });
    mockRepo.softDelete.mockResolvedValue(undefined);

    const result = await webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1');
    expect(result.id).toBe('wh-1');
  });

  it('+ should call listByWorkspace with correct ID', async () => {
    mockRepo.listByWorkspace.mockResolvedValue([]);
    await webhookService.listWebhooksByWorkspace('ws-99');
    expect(mockRepo.listByWorkspace).toHaveBeenCalledWith('ws-99');
  });

  it('+ should return multiple webhooks', async () => {
    mockRepo.listByWorkspace.mockResolvedValue([
      { id: 'wh-1', name: 'Slack' },
      { id: 'wh-2', name: 'Teams' },
      { id: 'wh-3', name: 'Discord' },
    ]);

    const result = await webhookService.listWebhooksByWorkspace('ws-1');
    expect(result).toHaveLength(3);
  });

  it('+ should call findById with correct ID', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'wh-1' });
    await webhookService.getWebhookById('wh-1');
    expect(mockRepo.findById).toHaveBeenCalledWith('wh-1');
  });

  it('+ should call softDelete with correct ID', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1', name: 'Hook' });
    mockRepo.softDelete.mockResolvedValue(undefined);

    const result = await webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1');
    expect(result.id).toBe('wh-1');
  });

  it('+ should call update with correct ID', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1' });
    mockRepo.update.mockResolvedValue({ id: 'wh-1', name: 'Updated' });

    const result = await webhookService.updateWebhook('wh-1', { name: 'Updated' }, 'user-1', 'ws-1');
    expect(result.name).toBe('Updated');
  });

  it('+ should call create with correct data', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', name: 'Hook' });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed'] }, 'user-1');
    expect(result.name).toBe('Hook');
  });

  it('- should throw for invalid webhook ID on getById', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(webhookService.getWebhookById('invalid')).rejects.toThrow('Webhook not found');
  });

  it('+ should handle createWebhook with multiple events', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', events: ['scan.completed', 'finding.created'] });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.completed', 'finding.created'] }, 'user-1');
    expect(result.events).toHaveLength(2);
  });

  it('+ should handle updateWebhook with URL change', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1' });
    mockRepo.update.mockResolvedValue({ id: 'wh-1', url: 'https://new-hook.com' });

    const result = await webhookService.updateWebhook('wh-1', { url: 'https://new-hook.com' }, 'user-1', 'ws-1');
    expect(result.url).toBe('https://new-hook.com');
  });

  it('+ should handle listWebhooksByWorkspace with many webhooks', async () => {
    const webhooks = Array.from({ length: 15 }, (_, i) => ({ id: `wh-${i}`, name: `Hook ${i}` }));
    mockRepo.listByWorkspace.mockResolvedValue(webhooks);

    const result = await webhookService.listWebhooksByWorkspace('ws-1');
    expect(result).toHaveLength(15);
  });

  it('+ should handle deleteWebhook returning webhook data', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.findById.mockResolvedValue({ id: 'wh-1', name: 'Deleted Hook', url: 'https://old.com' });
    mockRepo.softDelete.mockResolvedValue(undefined);

    const result = await webhookService.deleteWebhook('wh-1', 'user-1', 'ws-1');
    expect(result.name).toBe('Deleted Hook');
    expect(result.url).toBe('https://old.com');
  });

  it('+ should handle createWebhook with different event types', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.create.mockResolvedValue({ id: 'wh-1', events: ['scan.started'] });

    const result = await webhookService.createWebhook('ws-1', { name: 'Hook', url: 'https://hook.com', events: ['scan.started'] }, 'user-1');
    expect(result.events).toContain('scan.started');
  });
});
