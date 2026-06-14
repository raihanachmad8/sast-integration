import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  getConfig: vi.fn(),
  upsertConfig: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

vi.mock('@/server/modules/quality-gates/quality-gates.repository', () => ({
  qualityGatesRepository: mockRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

const { qualityGatesService } = await import('@/server/modules/quality-gates/quality-gates.service');

describe('qualityGatesService.getConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return config for workspace', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1', threshold: 'high', failOnCritical: true });
    const result = await qualityGatesService.getConfig('ws-1');
    expect(result.threshold).toBe('high');
    expect(result.failOnCritical).toBe(true);
  });

  it('+ should return null when no config exists', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    const result = await qualityGatesService.getConfig('ws-1');
    expect(result).toBeNull();
  });

  it('- should call repo with correct workspaceId', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    await qualityGatesService.getConfig('ws-2');
    expect(mockRepo.getConfig).toHaveBeenCalledWith('ws-2');
  });
});

describe('qualityGatesService.updateConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should update config when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'high' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'high', fail_on_critical: true, fail_on_high_tp: false, warn_on_pending: true, require_human_ack: false, pending_behavior: 'warn' },
      'ws-1',
      'user-1'
    );
    expect(result.threshold).toBe('high');
  });

  it('+ should allow manager to update config', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1' });

    await expect(
      qualityGatesService.updateConfig(
        { threshold: 'medium', fail_on_critical: false, fail_on_high_tp: false, warn_on_pending: false, require_human_ack: false, pending_behavior: 'fail' },
        'ws-1',
        'user-1'
      )
    ).resolves.toBeDefined();
  });

  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(
      qualityGatesService.updateConfig({ threshold: 'medium' }, 'ws-1', 'user-1')
    ).rejects.toThrow('You are not a member');
  });

  it('- should call repo with correct workspaceId', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.upsertConfig.mockResolvedValue({});
    await qualityGatesService.updateConfig(
      { threshold: 'low', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: false, require_human_ack: true, pending_behavior: 'ignore' },
      'ws-2',
      'user-1'
    );
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-2', expect.objectContaining({ threshold: 'low' }));
  });
});

describe('qualityGatesService edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should handle owner role for updateConfig', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'critical' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'critical', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: false, require_human_ack: false, pending_behavior: 'warn' },
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('critical');
  });

  it('- should throw for viewer role', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  it('- should throw for member role (only owner/manager allowed)', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  it('+ should call getConfig with correct workspaceId', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    await qualityGatesService.getConfig('ws-99');
    expect(mockRepo.getConfig).toHaveBeenCalledWith('ws-99');
  });

  it('+ should return full config object', async () => {
    mockRepo.getConfig.mockResolvedValue({
      id: 'qg-1',
      threshold: 'high',
      failOnCritical: true,
      failOnHighTp: false,
      warnOnPending: true,
      requireHumanAck: false,
      pendingBehavior: 'warn',
    });

    const result = await qualityGatesService.getConfig('ws-1');
    expect(result.id).toBe('qg-1');
    expect(result.failOnCritical).toBe(true);
    expect(result.failOnHighTp).toBe(false);
    expect(result.warnOnPending).toBe(true);
  });

  it('+ should handle different threshold values', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'low' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'low', fail_on_critical: false, fail_on_high_tp: false, warn_on_pending: false, require_human_ack: false, pending_behavior: 'ignore' },
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('low');
  });

  it('+ should handle pending_behavior fail', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', pendingBehavior: 'fail' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'high', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: false, pending_behavior: 'fail' },
      'ws-1', 'user-1'
    );
    expect(result.pendingBehavior).toBe('fail');
  });

  it('+ should handle pending_behavior ignore', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', pendingBehavior: 'ignore' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'high', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: false, pending_behavior: 'ignore' },
      'ws-1', 'user-1'
    );
    expect(result.pendingBehavior).toBe('ignore');
  });

  it('+ should handle requireHumanAck true', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', requireHumanAck: true });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'high', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: true, pending_behavior: 'warn' },
      'ws-1', 'user-1'
    );
    expect(result.requireHumanAck).toBe(true);
  });

  it('+ should handle all flags false', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({
      id: 'qg-1',
      failOnCritical: false,
      failOnHighTp: false,
      warnOnPending: false,
      requireHumanAck: false,
    });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'critical', fail_on_critical: false, fail_on_high_tp: false, warn_on_pending: false, require_human_ack: false, pending_behavior: 'warn' },
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(false);
  });

  it('+ should handle all flags true', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({
      id: 'qg-1',
      failOnCritical: true,
      failOnHighTp: true,
      warnOnPending: true,
      requireHumanAck: true,
    });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'low', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: true, pending_behavior: 'fail' },
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(true);
    expect(result.failOnHighTp).toBe(true);
    expect(result.warnOnPending).toBe(true);
    expect(result.requireHumanAck).toBe(true);
  });

  it('+ should call upsertConfig with correct data', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1' });

    await qualityGatesService.updateConfig(
      { threshold: 'medium', fail_on_critical: true, fail_on_high_tp: false, warn_on_pending: true, require_human_ack: false, pending_behavior: 'warn' },
      'ws-1', 'user-1'
    );
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-1', expect.objectContaining({ threshold: 'medium' }));
  });

  it('- should throw for undefined role', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(undefined);
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  it('+ should handle getConfig returning full object', async () => {
    const fullConfig = {
      id: 'qg-1',
      workspaceId: 'ws-1',
      threshold: 'critical',
      failOnCritical: true,
      failOnHighTp: true,
      warnOnPending: true,
      requireHumanAck: false,
      pendingBehavior: 'fail',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRepo.getConfig.mockResolvedValue(fullConfig);

    const result = await qualityGatesService.getConfig('ws-1');
    expect(result).toEqual(fullConfig);
  });

  it('+ should handle getConfig for different workspaces', async () => {
    mockRepo.getConfig.mockImplementation((wsId: string) => Promise.resolve({ id: `qg-${wsId}`, workspaceId: wsId }));

    const result1 = await qualityGatesService.getConfig('ws-1');
    const result2 = await qualityGatesService.getConfig('ws-2');
    expect(result1.workspaceId).toBe('ws-1');
    expect(result2.workspaceId).toBe('ws-2');
  });

  it('+ should call getConfig multiple times independently', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1' });
    await qualityGatesService.getConfig('ws-1');
    await qualityGatesService.getConfig('ws-1');
    expect(mockRepo.getConfig).toHaveBeenCalledTimes(2);
  });

  it('- should handle null config gracefully', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    const result = await qualityGatesService.getConfig('ws-empty');
    expect(result).toBeNull();
  });

  it('+ should preserve threshold in updateConfig', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'critical' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'critical', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: true, pending_behavior: 'fail' },
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('critical');
  });

  it('+ should handle rapid successive getConfig calls', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1' });
    const results = await Promise.all([
      qualityGatesService.getConfig('ws-1'),
      qualityGatesService.getConfig('ws-1'),
      qualityGatesService.getConfig('ws-1'),
    ]);
    expect(results).toHaveLength(3);
  });

  it('+ should handle updateConfig with all threshold values', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'medium' });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'medium', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: false, pending_behavior: 'warn' },
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('medium');
  });

  it('+ should handle getConfig returning complete config', async () => {
    mockRepo.getConfig.mockResolvedValue({
      id: 'qg-1',
      workspaceId: 'ws-1',
      threshold: 'high',
      failOnCritical: true,
      failOnHighTp: true,
      warnOnPending: true,
      requireHumanAck: false,
      pendingBehavior: 'warn',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await qualityGatesService.getConfig('ws-1');
    expect(result.id).toBe('qg-1');
    expect(result.workspaceId).toBe('ws-1');
    expect(result.threshold).toBe('high');
  });

  it('+ should handle updateConfig returning full object', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({
      id: 'qg-1',
      threshold: 'critical',
      failOnCritical: true,
      failOnHighTp: true,
      warnOnPending: true,
      requireHumanAck: true,
      pendingBehavior: 'fail',
    });

    const result = await qualityGatesService.updateConfig(
      { threshold: 'critical', fail_on_critical: true, fail_on_high_tp: true, warn_on_pending: true, require_human_ack: true, pending_behavior: 'fail' },
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(true);
    expect(result.failOnHighTp).toBe(true);
    expect(result.warnOnPending).toBe(true);
    expect(result.requireHumanAck).toBe(true);
    expect(result.pendingBehavior).toBe('fail');
  });

  it('+ should handle getConfig for workspace with no config', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    const result = await qualityGatesService.getConfig('ws-new');
    expect(result).toBeNull();
  });
});
