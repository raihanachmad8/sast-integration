import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { HTTP } from '@/server/http/constants';
import { ROLE } from '@/commons/constants/permissions';
import { workspaceRepository } from './workspace.repository';
import { WORKSPACE } from './constants';
import type { AuthContext } from '@/server/http/authenticate';

type Role = typeof ROLE[keyof typeof ROLE];

const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLE.OWNER]: 4,
  [ROLE.MANAGER]: 3,
  [ROLE.REVIEWER]: 2,
  [ROLE.MEMBER]: 1,
};

interface WorkspaceContext {
  workspaceId: string;
  role: Role;
}

interface PermissionSuccess {
  success: true;
  context: WorkspaceContext;
}

interface PermissionFailure {
  success: false;
  response: ReturnType<typeof ApiResponse.error>;
}

/**
 * Verify user has required role in workspace (from X-Workspace-Id header).
 * Role hierarchy: owner > manager > reviewer > member.
 *
 * @param request - Next.js request (reads X-Workspace-Id header)
 * @param auth - Authenticated user context
 * @param minRole - Minimum role required (default: member)
 */
export async function requireWorkspaceRole(
  request: NextRequest,
  auth: AuthContext,
  minRole: Role = ROLE.MEMBER,
): Promise<PermissionSuccess | PermissionFailure> {
  const workspaceId = request.headers.get(HTTP.HEADERS.WORKSPACE_ID);
  if (!workspaceId) {
    return { success: false, response: ApiResponse.error(WORKSPACE.ERRORS.WORKSPACE_REQUIRED, WORKSPACE.ERROR_CODE, undefined, 400) };
  }

  const role = await workspaceRepository.getMemberRole(workspaceId, auth.userId);
  if (!role) {
    return { success: false, response: ApiResponse.error(WORKSPACE.ERRORS.NOT_MEMBER, WORKSPACE.ERROR_CODE, undefined, 403) };
  }

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    return { success: false, response: ApiResponse.error(WORKSPACE.ERRORS.NOT_OWNER, WORKSPACE.ERROR_CODE, undefined, 403) };
  }

  return { success: true, context: { workspaceId, role } };
}
