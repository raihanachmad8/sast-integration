import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/repositories
 * List all discovered and imported repositories in a workspace.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const rows = await projectRepository.listRepositoriesByWorkspace(workspaceId);
    return ApiResponse.success('Repositories retrieved', rows);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    console.error('[Repositories] List failed', e);
    return ApiResponse.error('Failed to list repositories', 'INTERNAL_ERROR', undefined, 500);
  }
}
