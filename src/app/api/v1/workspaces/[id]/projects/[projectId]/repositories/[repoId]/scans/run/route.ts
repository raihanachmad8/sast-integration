import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { managedScanService } from '@/server/modules/scan/services/managed-scan.service';

type Params = { params: Promise<{ id: string; projectId: string; repoId: string }> };

const runManagedScanSchema = z.object({
  branch: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('Manual managed scans require user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, projectId, repoId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, runManagedScanSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await managedScanService.triggerManualScan({
      workspaceId,
      projectId,
      repositoryId: repoId,
      userId,
      branch: validation.data.branch,
    });

    return ApiResponse.success('Managed scan queued', result);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
