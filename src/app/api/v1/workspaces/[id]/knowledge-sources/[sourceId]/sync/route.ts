import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { knowledgeSourceService } from '@/server/modules/knowledge-base/knowledge-source.service';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; sourceId: string }> };

/**
 * POST /api/v1/workspaces/:id/knowledge-sources/:sourceId/sync
 * Trigger a sync for a knowledge source.
 * Only Manager/Owner can trigger sync.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, sourceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const result = await knowledgeSourceService.triggerSync(sourceId, workspaceId);
    return ApiResponse.success(result.message, null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
