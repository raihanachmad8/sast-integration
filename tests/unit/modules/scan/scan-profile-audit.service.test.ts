/**
 * Unit tests for audited scan profile service behavior.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockScanProfileRepo = {
  findById: vi.fn(),
  countAttachedRepositories: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/server/modules/scan/repositories/scan-profile.repository', () => ({
  scanProfileRepository: mockScanProfileRepo,
}));

const { scanProfileService } = await import('@/server/modules/scan/services/scan-profile.service');

describe('scanProfileService audited behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify scan profiles cannot be deleted while active schedules still reference them.
   */
  it('should reject deleting a policy used by schedules', async () => {
    mockScanProfileRepo.findById.mockResolvedValue({ id: 'policy-1', workspace_id: 'workspace-1' });
    mockScanProfileRepo.countAttachedRepositories.mockResolvedValue(2);

    await expect(scanProfileService.deletePolicy('policy-1')).rejects.toThrow(
      'Cannot delete scan policy while it is used by 2 active schedule/schedules',
    );
    expect(mockScanProfileRepo.delete).not.toHaveBeenCalled();
  });
});
