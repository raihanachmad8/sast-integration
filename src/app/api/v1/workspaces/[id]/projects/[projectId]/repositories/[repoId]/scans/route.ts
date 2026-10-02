import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';

type Params = { params: Promise<{ id: string; projectId: string; repoId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, projectId, repoId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const repoData = await projectRepository.findRepositoryByIdAndWorkspace(repoId, workspaceId);
    if (!repoData || repoData.project.id !== projectId) {
      return ApiResponse.error('Repository not found in this project', 'NOT_FOUND', undefined, 404);
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 25), 1), 100);
    const scans = await scanRepository.listByRepository(repoId, limit);

    return ApiResponse.success('Repository scans retrieved', {
      repository: repoData.repository,
      scans,
    });
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
