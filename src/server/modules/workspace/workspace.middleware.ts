import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { HTTP } from '@/server/http/constants';
import { ROLE_PERMISSIONS, type PermissionKey } from '@/commons/constants/permissions';
import { workspaceRepository } from './repositories/workspace.repository';
import { WORKSPACE } from './constants';
import type { AuthContext } from '@/server/http/authenticate';

interface WorkspaceContext {
  workspaceId: string;
  role: string;
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
 * Verify user has a specific permission in workspace (from X-Workspace-Id header).
 * Uses ROLE_PERMISSIONS constant — no DB permission tables needed.
 *
 * @param request - Next.js request (reads X-Workspace-Id header)
 * @param auth - Authenticated user context
 * @param permission - Required permission (e.g. 'team:manage')
 */
export async function requirePermission(
  request: NextRequest,
  auth: AuthContext,
  permission: string,
): Promise<PermissionSuccess | PermissionFailure> {
  const workspaceId = request.headers.get(HTTP.HEADERS.WORKSPACE_ID);
  if (!workspaceId) {
    return { success: false, response: ApiResponse.error(WORKSPACE.ERRORS.WORKSPACE_REQUIRED, WORKSPACE.ERROR_CODE, undefined, 400) };
  }

  const role = await workspaceRepository.getMemberRole(workspaceId, auth.userId);
  if (!role) {
    return { success: false, response: ApiResponse.error(WORKSPACE.ERRORS.NOT_MEMBER, WORKSPACE.ERROR_CODE, undefined, 403) };
  }

  const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
  if (!rolePerms.includes(permission as PermissionKey)) {
    return { success: false, response: ApiResponse.error(`Insufficient permissions: "${permission}" required`, WORKSPACE.ERROR_CODE, undefined, 403) };
  }

  return { success: true, context: { workspaceId, role } };
}

/** Create a request with X-Workspace-Id header injected from a URL param. */
export function withWorkspaceId(request: NextRequest, workspaceId: string): NextRequest {
  const headers = new Headers(request.headers);
  headers.set(HTTP.HEADERS.WORKSPACE_ID, workspaceId);
  return new NextRequest(request.url, { headers });
}
