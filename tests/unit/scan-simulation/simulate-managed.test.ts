/**
 * Simulation tests for managed scan trigger flow.
 *
 * Tests the complete trigger pipeline:
 * 1. Repository validation
 *   - Must be SCM-connected
 *   - Uses default scanners unless a scan policy is provided
 *   - Policy must have supported scanners
 * 2. Scan record creation
 * 3. Job enqueueing
 * 4. Scanner normalization (filter unsupported)
 * 5. Branch resolution (default vs explicit)
 *
 * These tests verify the orchestration logic without executing
 * actual scanner binaries or git clone operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks ---

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
  },
}));

vi.mock('@/server/modules/queue/queue.service', () => ({
  enqueue: vi.fn().mockResolvedValue('job-managed-1'),
}));

import { managedScanService } from '@/server/modules/scan/services/managed-scan.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanProfileRepository as scanPolicyRepository } from '@/server/modules/scan/repositories/scan-profile.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { enqueue } from '@/server/modules/queue/queue.service';

const mockProjectRepo = vi.mocked(projectRepository);
const mockPolicyRepo = vi.mocked(scanPolicyRepository);
const mockScanRepo = vi.mocked(scanRepository);
const mockEnqueue = vi.mocked(enqueue);

// --- Helper to setup valid mock data ---

function setupValidRepo() {
  mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
    repository: {
      id: 'repo-1',
      connection_type: 'scm',
      default_branch: 'main',
      url: 'https://github.com/acme/app',
    },
    project: { id: 'proj-1', workspace_id: 'ws-1' },
  }));
}

function setupValidPolicy(scanners: string[] = ['semgrep', 'gitleaks']) {
  mockPolicyRepo.findById.mockResolvedValue(mockValue({
    id: 'policy-1',
    workspace_id: 'ws-1',
    scanners,
    timeout_seconds: 300,
    name: 'Standard Policy',
  }));
}

// --- Tests ---------------------------------------------------------------

describe('Managed Scan Simulation - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that triggering a managed scan requires
   * an SCM-connected repository (not external).
   */
  it('should reject external repositories', async () => {
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

  /**
   * Purpose: Verify that default scanners are used when no scan policy is provided.
   */
  it('should use default scanners when no scan policy is provided', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', connection_type: 'scm', default_branch: 'main', url: 'https://github.com/acme/app' },
      project: { id: 'proj-1' },
    }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'queued' }));

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
    });

    expect(result.scanners).toEqual(['semgrep', 'gitleaks', 'trivy']);
  });

  /**
   * Purpose: Verify that the policy must have at least one
   * supported scanner configured.
   */
  it('should reject when policy has no supported scanners', async () => {
    setupValidRepo();
    mockPolicyRepo.findById.mockResolvedValue(mockValue({
      id: 'policy-1',
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
        policyId: 'policy-1',
      })
    ).rejects.toThrow('no supported scanners');
  });
});

describe('Managed Scan Simulation - Trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupValidRepo();
    setupValidPolicy();
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'queued' }));
  });

  /**
   * Purpose: Verify that a successful trigger creates a scan record
   * and enqueues a managed scan job with the correct data.
   */
  it('should create scan record and enqueue job', async () => {
    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      policyId: 'policy-1',
    });

    expect(result.scanId).toBe('scan-1');
    expect(result.status).toBe('queued');
    expect(result.scanners).toEqual(['semgrep', 'gitleaks']);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        scanId: 'scan-1',
        projectId: 'proj-1',
        repositoryId: 'repo-1',
        repositoryUrl: 'https://github.com/acme/app',
        branch: 'main',
        scanners: ['semgrep', 'gitleaks'],
      })
    );
  });

  /**
   * Purpose: Verify that unsupported scanners in the policy are filtered out.
   * Only scanners with CLI configurations in SCANNER_COMMANDS are included.
   */
  it('should filter out unsupported scanners from policy', async () => {
    setupValidPolicy(['semgrep', 'unknown-scanner', 'trivy']);

    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      policyId: 'policy-1',
    });

    expect(result.scanners).toEqual(['semgrep', 'trivy']);
    expect(result.scanners).not.toContain('unknown-scanner');
  });

  /**
   * Purpose: Verify that the default branch from the repository
   * is used when no branch is specified in the trigger input.
   */
  it('should use repository default branch when none specified', async () => {
    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      policyId: 'policy-1',
    });

    expect(result.branch).toBe('main');
  });

  /**
   * Purpose: Verify that an explicit branch in the trigger input
   * overrides the repository's default branch.
   */
  it('should use explicit branch when provided', async () => {
    const result = await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      policyId: 'policy-1',
      branch: 'feature/scanning',
    });

    expect(result.branch).toBe('feature/scanning');
  });

  /**
   * Purpose: Verify that the triggerSource is correctly propagated
   * to the scan record for audit trail purposes.
   */
  it('should record trigger source in scan creation', async () => {
    await managedScanService.triggerManualScan({
      workspaceId: 'ws-1',
      repositoryId: 'repo-1',
      userId: 'user-1',
      policyId: 'policy-1',
      triggerSource: 'webhook',
    });

    expect(mockScanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerSource: 'webhook' })
    );
  });
});
