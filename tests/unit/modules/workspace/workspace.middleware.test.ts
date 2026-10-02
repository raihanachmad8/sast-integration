/**
 * Unit tests for workspace route authorization middleware.
 *
 * Covers how workspace-scoped API routes pass their route parameter into the
 * shared role checker.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@/commons/constants/permissions';
import { HTTP } from '@/server/http/constants';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn(),
  },
}));

const mockWorkspaceRepository = vi.mocked(workspaceRepository);

const auth = {
  type: 'user_session',
  userId: 'user-1',
  email: 'user@example.com',
  sessionId: 'session-1',
} as const;

function request(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe('requireWorkspaceRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify workspace-scoped routes can authorize using the route
   * parameter, so clients do not need to duplicate the same ID in a header.
   */
  it('should use the workspace id from a workspace-scoped API route', async () => {
    mockWorkspaceRepository.getMemberRole.mockResolvedValue(ROLE.MEMBER);

    const result = await requireWorkspaceRole(
      request('/api/v1/workspaces/ws-1/knowledge-base'),
      auth,
      ROLE.MEMBER,
    );

    expect(result.success).toBe(true);
    expect(mockWorkspaceRepository.getMemberRole).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  /**
   * Purpose: Prevent a request from authorizing against one workspace header
   * while reading or mutating another workspace from the URL path.
   */
  it('should reject requests when route and header workspace IDs differ', async () => {
    const result = await requireWorkspaceRole(
      request('/api/v1/workspaces/ws-1/knowledge-base', {
        [HTTP.HEADERS.WORKSPACE_ID]: 'ws-2',
      }),
      auth,
      ROLE.MEMBER,
    );

    expect(result.success).toBe(false);
    expect(mockWorkspaceRepository.getMemberRole).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Preserve existing header-based authorization for API routes that
   * are not nested under /workspaces/:id.
   */
  it('should still use x-workspace-id for non-workspace-scoped routes', async () => {
    mockWorkspaceRepository.getMemberRole.mockResolvedValue(ROLE.MANAGER);

    const result = await requireWorkspaceRole(
      request('/api/v1/auth/invite', {
        [HTTP.HEADERS.WORKSPACE_ID]: 'ws-1',
      }),
      auth,
      ROLE.MANAGER,
    );

    expect(result.success).toBe(true);
    expect(mockWorkspaceRepository.getMemberRole).toHaveBeenCalledWith('ws-1', 'user-1');
  });
});
