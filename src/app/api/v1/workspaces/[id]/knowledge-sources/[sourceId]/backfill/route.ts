import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ROLE } from '@/commons/constants/permissions';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { knowledgeBackfillService } from '@/server/modules/knowledge-base/knowledge-backfill.service';

type Params = { params: Promise<{ id: string; sourceId: string }> };

function internalErrorDetails(error: unknown) {
  if (process.env.NODE_ENV === 'production') return undefined;
  return {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'UnknownError',
  };
}

/**
 * GET /api/v1/workspaces/:id/knowledge-sources/:sourceId/backfill
 * Returns the latest historical backfill status for an NVD knowledge source.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, sourceId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const job = await knowledgeBackfillService.getLatest(workspaceId, sourceId);
    return ApiResponse.success('Knowledge backfill status retrieved', job);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    console.error('[knowledge-backfill] Failed to load backfill status', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', internalErrorDetails(e), 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/knowledge-sources/:sourceId/backfill
 * Starts or resumes historical NVD backfill.
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
    const job = await knowledgeBackfillService.start(workspaceId, sourceId);
    return ApiResponse.success('NVD historical backfill queued', job);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    console.error('[knowledge-backfill] Failed to start backfill', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', internalErrorDetails(e), 500);
  }
}
