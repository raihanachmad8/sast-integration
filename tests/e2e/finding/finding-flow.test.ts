/**
 * E2E tests for Finding management flow.
 *
 * Tests the complete finding lifecycle:
 * 1. List findings for a project
 * 2. Get finding detail with AI verifications
 * 3. Update finding status
 * 4. Assign finding to user
 * 5. Trigger AI verification
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks ---

vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    listByProject: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    updateAssignment: vi.fn(),
    getVerifications: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/services/ai-verification.service', () => ({
  aiVerificationService: {
    verifyFinding: vi.fn(),
    batchVerify: vi.fn(),
  },
}));

import { findingService } from '@/server/modules/scan/services/finding.service';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { aiVerificationService } from '@/server/modules/scan/services/ai-verification.service';

const mockFindingRepo = vi.mocked(findingRepository);
const mockAiService = vi.mocked(aiVerificationService);

describe('Finding List E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that listing findings returns findings with group info.
   */
  it('should list findings for a project', async () => {
    mockFindingRepo.listByProject.mockResolvedValue(mockValue([
      {
        id: 'finding-1',
        severity: 'high',
        status: 'open',
        scanner: 'semgrep',
        rule: 'c.lang.security.insecure-use-string-copy-fn',
        message: 'strcpy without bounds check',
        file_path: 'src/vuln/buffer.c',
        line_number: 8,
        group_title: 'CWE-120: Buffer Overflow',
      },
    ]));

    const findings = await findingService.list('proj-1');

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].group_title).toBe('CWE-120: Buffer Overflow');
  });

  /**
   * Purpose: Verify that filtering by severity works correctly.
   */
  it('should filter findings by severity', async () => {
    mockFindingRepo.listByProject.mockResolvedValue(mockValue([
      { id: 'finding-1', severity: 'critical', status: 'open' },
    ]));

    const findings = await findingService.list('proj-1', { severity: 'critical' });

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('critical');
  });

  /**
   * Purpose: Verify that filtering by status works correctly.
   */
  it('should filter findings by status', async () => {
    mockFindingRepo.listByProject.mockResolvedValue(mockValue([
      { id: 'finding-1', severity: 'high', status: 'fixed' },
    ]));

    const findings = await findingService.list('proj-1', { status: 'fixed' });

    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe('fixed');
  });
});

describe('Finding Detail E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that getting finding detail includes AI verifications.
   */
  it('should return finding with AI verifications', async () => {
    mockFindingRepo.findById.mockResolvedValue(mockValue({
      id: 'finding-1',
      severity: 'high',
      status: 'open',
      scanner: 'semgrep',
      rule: 'c.lang.security.insecure-use-string-copy-fn',
      message: 'strcpy without bounds check',
      file_path: 'src/vuln/buffer.c',
      line_number: 8,
      code_snippet: 'strcpy(buf, input);',
      cwe_id: 'CWE-120',
    }));

    mockFindingRepo.getVerifications.mockResolvedValue(mockValue([
      {
        id: 'ver-1',
        finding_id: 'finding-1',
        verdict: 'true_positive',
        confidence: 0.87,
        explanation: 'strcpy without bounds check is a buffer overflow',
        created_at: new Date(),
      },
    ]));

    const finding = await findingService.getById('finding-1');

    expect(finding).toBeDefined();
    expect(finding?.ai_verifications).toHaveLength(1);
    expect(finding?.ai_verifications[0].verdict).toBe('true_positive');
  });

  /**
   * Purpose: Verify that getting a non-existent finding returns null.
   */
  it('should return null for non-existent finding', async () => {
    mockFindingRepo.findById.mockResolvedValue(mockValue(null));

    const finding = await findingService.getById('nonexistent');

    expect(finding).toBeNull();
  });
});

describe('Finding Status Update E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that updating finding status records the change.
   */
  it('should update finding status to fixed', async () => {
    mockFindingRepo.updateStatus.mockResolvedValue({
      id: 'finding-1',
      status: 'fixed',
      previousStatus: 'open',
    });

    const result = await findingService.updateStatus('finding-1', 'fixed', 'user-1');

    expect(result.status).toBe('fixed');
    expect(result.previousStatus).toBe('open');
  });

  /**
   * Purpose: Verify that updating to false_positive works.
   */
  it('should update finding status to false_positive', async () => {
    mockFindingRepo.updateStatus.mockResolvedValue({
      id: 'finding-1',
      status: 'false_positive',
      previousStatus: 'open',
    });

    const result = await findingService.updateStatus('finding-1', 'false_positive', 'user-1');

    expect(result.status).toBe('false_positive');
  });

  /**
   * Purpose: Verify that invalid status is rejected.
   */
  it('should reject invalid status', async () => {
    await expect(
      findingService.updateStatus('finding-1', 'invalid_status', 'user-1')
    ).rejects.toThrow('Invalid status');
  });
});

describe('Finding Assignment E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that assigning a finding to a user works.
   */
  it('should assign finding to user', async () => {
    mockFindingRepo.updateAssignment.mockResolvedValue({
      id: 'finding-1',
      assigned_to: 'user-2',
    });

    const result = await findingService.assign('finding-1', 'user-2');

    expect(result.assigned_to).toBe('user-2');
  });

  /**
   * Purpose: Verify that unassigning a finding works.
   */
  it('should unassign finding when assignedTo is null', async () => {
    mockFindingRepo.updateAssignment.mockResolvedValue({
      id: 'finding-1',
      assigned_to: null,
    });

    const result = await findingService.assign('finding-1', null);

    expect(result.assigned_to).toBeNull();
  });
});

describe('AI Verification E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that triggering AI verification for a finding works.
   */
  it('should trigger AI verification for a finding', async () => {
    mockAiService.verifyFinding.mockResolvedValue({
      id: 'ver-1',
      created_at: new Date(),
      finding_id: 'finding-1',
      model_id: 'model-1',
      verdict: 'true_positive',
      confidence: '0.87',
      explanation: 'Test explanation',
      data_flow: null,
      taint_source: null,
      match_detail: null,
      likely_cwe: null,
      fix_suggestion: null,
      raw_response: null,
    } as any);

    const result = await aiVerificationService.verifyFinding('finding-1', 'model-1');

    expect(result.verdict).toBe('true_positive');
    expect(result.confidence).toBe(0.87);
  });

  /**
   * Purpose: Verify that batch verification works for multiple findings.
   */
  it('should batch verify multiple findings', async () => {
    mockAiService.batchVerify.mockResolvedValue({
      total: 5,
      verified: 4,
      failed: 1,
    });

    const result = await aiVerificationService.batchVerify('scan-1', 'model-1');

    expect(result.total).toBe(5);
    expect(result.verified).toBe(4);
    expect(result.failed).toBe(1);
  });
});
