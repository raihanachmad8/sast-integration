/**
 * requirePermission Middleware Tests
 *
 * Tests the `requirePermission` middleware that checks workspace membership
 * and validates user permissions against ROLE_PERMISSIONS.
 *
 * Covers:
 * - Each role can access permitted endpoints
 * - Each role is denied restricted endpoints (403)
 * - Non-members are denied (403)
 * - Missing workspace header is rejected (400)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { ROLE, ROLE_PERMISSIONS, PERMISSION } from '@/commons/constants/permissions';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { HTTP } from '@/server/http/constants';

// Mock the repository call inside requirePermission
vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    workspace: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
  },
}));

import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
const mockGetMemberRole = vi.mocked(workspaceRepository.getMemberRole);

function createRequest(workspaceId?: string): NextRequest {
  const url = workspaceId
    ? `http://localhost:3000/api/v1/test`
    : 'http://localhost:3000/api/v1/test';
  const req = new NextRequest(url);
  if (workspaceId) {
    req.headers.set(HTTP.HEADERS.WORKSPACE_ID, workspaceId);
  }
  return req;
}

const authContext = { userId: 'user-123' };

describe('requirePermission Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ positive — has permission', () => {
    it('should allow Owner to access any permission', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.OWNER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.FINDING_OVERRIDE_AI);

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.workspaceId).toBe('ws-1');
      expect(result.context!.role).toBe(ROLE.OWNER);
    });

    it('should allow Manager to access manage permissions', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.MANAGER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.REPOSITORY_MANAGE);

      expect(result.success).toBe(true);
    });

    it('should allow Reviewer to access triage permissions', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.REVIEWER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.FINDING_TRIAGE);

      expect(result.success).toBe(true);
    });

    it('should allow Member to access view permissions', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.MEMBER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.DASHBOARD_VIEW);

      expect(result.success).toBe(true);
    });
  });

  describe('❌ negative — missing or restricted', () => {
    it('should return 403 when user is not a workspace member', async () => {
      mockGetMemberRole.mockResolvedValue(null);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.DASHBOARD_VIEW);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return 400 when no X-Workspace-Id header', async () => {
      const req = createRequest(); // no workspace ID

      const result = await requirePermission(req, authContext, PERMISSION.DASHBOARD_VIEW);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(400);
    });

    it('should return 403 when Member tries manage permission', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.MEMBER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.REPOSITORY_MANAGE);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return 403 when Reviewer tries manage permission', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.REVIEWER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.PROJECT_MANAGE);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return 403 when Manager tries MEMBER_MANAGE', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.MANAGER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.MEMBER_MANAGE);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(403);
    });

    it('should return correct error message for restricted permission', async () => {
      mockGetMemberRole.mockResolvedValue(ROLE.MEMBER);
      const req = createRequest('ws-1');

      const result = await requirePermission(req, authContext, PERMISSION.REPOSITORY_MANAGE);

      expect(result.success).toBe(false);
      const body = await result.response.json();
      expect(body.error.code).toBe(WORKSPACE.ERROR_CODE);
    });
  });

  describe('🔲 edge cases', () => {
    it('should check workspace membership before permission', async () => {
      mockGetMemberRole.mockResolvedValue(null);
      const req = createRequest('ws-1');

      await requirePermission(req, authContext, PERMISSION.DASHBOARD_VIEW);

      expect(mockGetMemberRole).toHaveBeenCalledWith('ws-1', 'user-123');
    });

    it('should handle invalid workspace ID gracefully', async () => {
      mockGetMemberRole.mockResolvedValue(null);
      const req = createRequest('nonexistent-workspace');

      const result = await requirePermission(req, authContext, PERMISSION.DASHBOARD_VIEW);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(403);
    });
  });
});
