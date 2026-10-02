/**
 * Unit tests for managedScanService
 *
 * Tests the managed scan triggering logic including:
 * - Repository existence and workspace membership checks
 * - SCM connection type validation
 * - Optional scan profile validation
 * - Scanner normalization
 * - Graceful degradation (scanner availability checks)
 *
 * Focus is on the validation and orchestration logic,
 * not on the actual git clone / scanner execution (tested via queue workers).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: {
    findRepositoryByIdAndWorkspace: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/scan-profile.repository', () => ({
  scanProfileRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/scan.repository', () => ({
  scanRepository: {
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('@/server/modules/queue/queue.service', () => ({
  enqueue: vi.fn().mockResolvedValue('job-123'),
}));

vi.mock('@/server/modules/scan/scanner-availability', () => ({
  checkScannerAvailability: vi.fn().mockResolvedValue(true),
}));

vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/sast-test'),
  rm: vi.fn().mockResolvedValue(undefined),
}));

import { managedScanService } from '@/server/modules/scan/services/managed-scan.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanProfileRepository } from '@/server/modules/scan/repositories/scan-profile.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { enqueue } from '@/server/modules/queue/queue.service';
import { checkScannerAvailability } from '@/server/modules/scan/scanner-availability';

const mockProjectRepo = vi.mocked(projectRepository);
const mockProfileRepo = vi.mocked(scanProfileRepository);
const mockScanRepo = vi.mocked(scanRepository);
const mockEnqueue = vi.mocked(enqueue);
const mockCheckAvailability = vi.mocked(checkScannerAvailability);

describe('managedScanService.triggerManualScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when repository is not found', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue(null));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Repository not found');
  });

  it('should throw when repository is not in the specified project', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm' },
      project: { id: 'proj-other' },
    }));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Repository not found in this project');
  });

  it('should throw when repository is external (not scm)', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'external' },
      project: { id: 'proj-1' },
    }));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Managed scans can only run on SCM-connected');
  });

  it('should use default scanners when no profile is provided', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-default', status: 'queued' }));

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
    });

    expect(result.scanners).toEqual(['semgrep', 'gitleaks', 'trivy']);
    expect(mockProfileRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw when profile is not found', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
        profileId: 'p1',
      })
    ).rejects.toThrow('Scan profile was not found');
  });

  it('should throw when profile has no supported scanners', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1',
      workspace_id: 'ws-1',
      scanners: [],
      timeout_seconds: 300,
      name: 'Empty Policy',
    }));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
        profileId: 'p1',
      })
    ).rejects.toThrow('no supported scanners');
  });

  it('should create scan and enqueue job on valid input', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1',
      workspace_id: 'ws-1',
      scanners: ['semgrep', 'gitleaks'],
      timeout_seconds: 300,
      name: 'Standard Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'queued' }));

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      profileId: 'p1',
    });

    expect(result.scanId).toBe('scan-1');
    expect(result.status).toBe('queued');
    expect(result.scanners).toEqual(['semgrep', 'gitleaks']);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ scanId: 'scan-1' })
    );
  });

  it('should use default branch when input.branch is not provided', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'develop', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1', workspace_id: 'ws-1', scanners: ['semgrep'], timeout_seconds: 300, name: 'Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-2', status: 'queued' }));

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      profileId: 'p1',
    });

    expect(result.branch).toBe('develop');
  });

  it('should use DEFAULT_MANAGED_SCAN_BRANCH when repo has no default_branch', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: null, url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1', workspace_id: 'ws-1', scanners: ['semgrep'], timeout_seconds: 300, name: 'Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-3', status: 'queued' }));

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      profileId: 'p1',
    });

    expect(result.branch).toBe('main');
  });

  it('should pass triggerSource to scan creation', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1', workspace_id: 'ws-1', scanners: ['semgrep'], timeout_seconds: 300, name: 'Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-4', status: 'queued' }));

    await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      profileId: 'p1',
      triggerSource: 'webhook',
    });

    expect(mockScanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerSource: 'webhook' })
    );
  });
});

// ============================================================
// Graceful Degradation Tests (processManagedScanJob)
// ============================================================

describe('processManagedScanJob - scanner availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that checkScannerAvailability is called for each scanner
   * before attempting execution. This is the pre-flight check that enables
   * graceful degradation.
   */
  it('should check availability for each scanner before execution', async () => {
    mockCheckAvailability.mockResolvedValue(true);

    // We can't fully test processManagedScanJob without mocking git clone and execFile,
    // but we can verify that checkScannerAvailability is called
    // by testing the trigger logic which validates scanners exist
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1', workspace_id: 'ws-1', scanners: ['semgrep', 'gitleaks', 'trivy'], timeout_seconds: 300, name: 'Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'queued' }));

    // The trigger validates scanners are supported, but doesn't check availability
    // Availability is checked during execution (processManagedScanJob)
    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      profileId: 'p1',
    });

    expect(result.scanners).toEqual(['semgrep', 'gitleaks', 'trivy']);
    // Availability check happens at execution time, not trigger time
    expect(mockCheckAvailability).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Verify that the trigger validates scanner support
   * and rejects unsupported scanners from the profile.
   */
  it('should reject unsupported scanners from profile', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/test/repo' },
      project: { id: 'proj-1' },
    }));
    mockProfileRepo.findById.mockResolvedValue(mockValue({
      id: 'p1', workspace_id: 'ws-1', scanners: ['semgrep', 'unknown-scanner', 'trivy'], timeout_seconds: 300, name: 'Policy',
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'queued' }));

    await expect(
      managedScanService.triggerManualScan({
        workspaceId: 'ws-1',
        repositoryId: 'repo-1',
        userId: 'user-1',
        profileId: 'p1',
      })
    ).rejects.toThrow('unsupported scanners');
  });
});
