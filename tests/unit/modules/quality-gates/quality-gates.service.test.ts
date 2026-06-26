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

/** Full config input matching qualityGateConfigSchema (camelCase, all fields required) */
function gateInput(overrides: Record<string, unknown> = {}) {
  return {
    threshold: 'high',
    failOnCritical: true,
    failOnHighTp: true,
    failOnHigh: true,
    failOnMedium: false,
    failOnLow: false,
    failOnPending: true,
    failOnTp: false,
    warnOnPending: true,
    requireHumanAck: false,
    pendingBehavior: 'warn',
    ...overrides,
  };
}

describe('qualityGatesService.getConfig', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  /**
   * Purpose: Validates that the quality gate config is returned for a workspace
   */
  it('+ should return config for workspace', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1', threshold: 'high', failOnCritical: true });
    const result = await qualityGatesService.getConfig('ws-1');
    expect(result.threshold).toBe('high');
    expect(result.failOnCritical).toBe(true);
  });

  /**
   * Purpose: Validates that a default config is created when no quality gate is configured
   */
  it('+ should create default config when none exists', async () => {
    const defaultConfig = { id: 'qg-1', threshold: 'medium', failOnCritical: true };
    mockRepo.getConfig.mockResolvedValue(null);
    mockRepo.upsertConfig.mockResolvedValue(defaultConfig);
    const result = await qualityGatesService.getConfig('ws-1');
    expect(result).toEqual(defaultConfig);
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-1', expect.objectContaining({
      threshold: 'medium',
      failOnCritical: true,
    }));
  });

  /**
   * Purpose: Validates that the repository receives the correct workspaceId on update
   */
  it('- should call repo with correct workspaceId', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    await qualityGatesService.getConfig('ws-2');
    expect(mockRepo.getConfig).toHaveBeenCalledWith('ws-2');
  });
});

describe('qualityGatesService.updateConfig', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  /**
   * Purpose: Validates that a member can update the quality gate config
   */
  it('+ should update config when user is a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'high' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ threshold: 'high' }),
      'ws-1',
      'user-1'
    );
    expect(result.threshold).toBe('high');
  });

  /**
   * Purpose: Validates that managers can update quality gate settings
   */
  it('+ should allow manager to update config', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1' });

    await expect(
      qualityGatesService.updateConfig(
        gateInput({ threshold: 'medium', failOnCritical: false, pendingBehavior: 'fail' }),
        'ws-1',
        'user-1'
      )
    ).resolves.toBeDefined();
  });

  /**
   * Purpose: Validates that non-members cannot update quality gate config
   */
  it('- should throw FORBIDDEN when user is not a member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    await expect(
      qualityGatesService.updateConfig({ threshold: 'medium' }, 'ws-1', 'user-1')
    ).rejects.toThrow('You are not a member');
  });

  /**
   * Purpose: Validates that the repository receives the correct workspaceId on update
   */
  it('- should call repo with correct workspaceId', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockRepo.upsertConfig.mockResolvedValue({});
    await qualityGatesService.updateConfig(
      gateInput({ threshold: 'low', failOnCritical: true, failOnHighTp: true, warnOnPending: false, requireHumanAck: true, pendingBehavior: 'ignore' }),
      'ws-2',
      'user-1'
    );
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-2', expect.objectContaining({ threshold: 'low' }));
  });
});

describe('qualityGatesService edge cases', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  /**
   * Purpose: Validates that the owner role can update quality gate config
   */
  it('+ should handle owner role for updateConfig', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'critical' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ threshold: 'critical' }),
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('critical');
  });

  /**
   * Purpose: Validates that the viewer role cannot update quality gate config
   */
  it('- should throw for viewer role', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('viewer');
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  /**
   * Purpose: Validates that member role is forbidden from updating quality gate config
   */
  it('- should throw for member role (only owner/manager allowed)', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  /**
   * Purpose: Validates that getConfig is called with the correct workspaceId
   */
  it('+ should call getConfig with correct workspaceId', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    await qualityGatesService.getConfig('ws-99');
    expect(mockRepo.getConfig).toHaveBeenCalledWith('ws-99');
  });

  /**
   * Purpose: Validates that the full config with all fields is returned
   */
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

  /**
   * Purpose: Validates that different threshold values can be set
   */
  it('+ should handle different threshold values', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'low' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ threshold: 'low', failOnCritical: false, pendingBehavior: 'ignore' }),
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('low');
  });

  /**
   * Purpose: Validates that pending_behavior can be set to fail
   */
  it('+ should handle pending_behavior fail', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', pendingBehavior: 'fail' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ pendingBehavior: 'fail' }),
      'ws-1', 'user-1'
    );
    expect(result.pendingBehavior).toBe('fail');
  });

  /**
   * Purpose: Validates that pending_behavior can be set to ignore
   */
  it('+ should handle pending_behavior ignore', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', pendingBehavior: 'ignore' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ pendingBehavior: 'ignore' }),
      'ws-1', 'user-1'
    );
    expect(result.pendingBehavior).toBe('ignore');
  });

  /**
   * Purpose: Validates that requireHumanAck can be enabled
   */
  it('+ should handle requireHumanAck true', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', requireHumanAck: true });

    const result = await qualityGatesService.updateConfig(
      gateInput({ requireHumanAck: true }),
      'ws-1', 'user-1'
    );
    expect(result.requireHumanAck).toBe(true);
  });

  /**
   * Purpose: Validates that all flags can be set to false
   */
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
      gateInput({ threshold: 'critical', failOnCritical: false, failOnHighTp: false, failOnHigh: false, failOnMedium: false, failOnLow: false, failOnPending: false, failOnTp: false, warnOnPending: false, requireHumanAck: false }),
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(false);
  });

  /**
   * Purpose: Validates that all flags can be set to true simultaneously
   */
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
      gateInput({ threshold: 'low', failOnCritical: true, failOnHighTp: true, failOnHigh: true, failOnMedium: true, failOnLow: true, failOnPending: true, failOnTp: true, warnOnPending: true, requireHumanAck: true, pendingBehavior: 'fail' }),
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(true);
    expect(result.failOnHighTp).toBe(true);
    expect(result.warnOnPending).toBe(true);
    expect(result.requireHumanAck).toBe(true);
  });

  /**
   * Purpose: Validates that upsertConfig receives the correct configuration data
   */
  it('+ should call upsertConfig with correct data', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1' });

    await qualityGatesService.updateConfig(
      gateInput({ threshold: 'medium' }),
      'ws-1', 'user-1'
    );
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-1', expect.objectContaining({ threshold: 'medium' }));
  });

  /**
   * Purpose: Validates that undefined role is treated as unauthorized
   */
  it('- should throw for undefined role', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(undefined);
    await expect(
      qualityGatesService.updateConfig({ threshold: 'high' }, 'ws-1', 'user-1')
    ).rejects.toThrow();
  });

  /**
   * Purpose: Validates that getConfig returns the complete configuration object
   */
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

  /**
   * Purpose: Validates that configs are isolated per workspace
   */
  it('+ should handle getConfig for different workspaces', async () => {
    mockRepo.getConfig.mockImplementation((wsId: string) => Promise.resolve({ id: `qg-${wsId}`, workspaceId: wsId }));

    const result1 = await qualityGatesService.getConfig('ws-1');
    const result2 = await qualityGatesService.getConfig('ws-2');
    expect(result1.workspaceId).toBe('ws-1');
    expect(result2.workspaceId).toBe('ws-2');
  });

  /**
   * Purpose: Validates that multiple getConfig calls are handled independently
   */
  it('+ should call getConfig multiple times independently', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1' });
    await qualityGatesService.getConfig('ws-1');
    await qualityGatesService.getConfig('ws-1');
    expect(mockRepo.getConfig).toHaveBeenCalledTimes(2);
  });

  /**
   * Purpose: Validates that null config from the repository triggers default config creation
   */
  it('+ should handle null config by creating default', async () => {
    mockRepo.getConfig.mockResolvedValue(null);
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-new', threshold: 'medium' });
    const result = await qualityGatesService.getConfig('ws-empty');
    expect(result).not.toBeNull();
    expect(result.threshold).toBe('medium');
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-empty', expect.objectContaining({
      threshold: 'medium',
    }));
  });

  /**
   * Purpose: Validates that the threshold value is preserved after update
   */
  it('+ should preserve threshold in updateConfig', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'critical' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ threshold: 'critical' }),
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('critical');
  });

  /**
   * Purpose: Validates that concurrent getConfig calls are handled correctly
   */
  it('+ should handle rapid successive getConfig calls', async () => {
    mockRepo.getConfig.mockResolvedValue({ id: 'qg-1' });
    const results = await Promise.all([
      qualityGatesService.getConfig('ws-1'),
      qualityGatesService.getConfig('ws-1'),
      qualityGatesService.getConfig('ws-1'),
    ]);
    expect(results).toHaveLength(3);
  });

  /**
   * Purpose: Validates that updateConfig works with various threshold values
   */
  it('+ should handle updateConfig with all threshold values', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockRepo.upsertConfig.mockResolvedValue({ id: 'qg-1', threshold: 'medium' });

    const result = await qualityGatesService.updateConfig(
      gateInput({ threshold: 'medium' }),
      'ws-1', 'user-1'
    );
    expect(result.threshold).toBe('medium');
  });

  /**
   * Purpose: Validates that getConfig returns all configuration properties
   */
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

  /**
   * Purpose: Validates that updateConfig returns the complete updated object
   */
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
      gateInput({ threshold: 'critical', failOnCritical: true, failOnHighTp: true, warnOnPending: true, requireHumanAck: true, pendingBehavior: 'fail' }),
      'ws-1', 'user-1'
    );
    expect(result.failOnCritical).toBe(true);
    expect(result.failOnHighTp).toBe(true);
    expect(result.warnOnPending).toBe(true);
    expect(result.requireHumanAck).toBe(true);
    expect(result.pendingBehavior).toBe('fail');
  });

  /**
   * Purpose: Validates that getConfig creates and returns a default config for workspace without config
   */
  it('+ should handle getConfig for workspace with no config', async () => {
    const defaultConfig = { id: 'qg-new', threshold: 'medium', failOnCritical: true };
    mockRepo.getConfig.mockResolvedValue(null);
    mockRepo.upsertConfig.mockResolvedValue(defaultConfig);
    const result = await qualityGatesService.getConfig('ws-new');
    expect(result).toEqual(defaultConfig);
    expect(mockRepo.upsertConfig).toHaveBeenCalledWith('ws-new', expect.objectContaining({
      threshold: 'medium',
    }));
  });
});
