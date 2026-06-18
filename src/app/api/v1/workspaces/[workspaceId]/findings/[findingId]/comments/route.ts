import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { commentService } from '@/server/modules/scan/services/finding.service';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/findings/:findingId/comments
 * List all comments for a finding.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const comments = await commentService.listByFinding(findingId);
    return ApiResponse.success('Comments retrieved', comments);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get comments', 'INTERNAL_ERROR', undefined, 500);
  }
}

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment too long'),
});

/**
 * POST /api/v1/workspaces/:workspaceId/findings/:findingId/comments
 * Add a comment to a finding.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, createCommentSchema);
    if (!validation.success) return validation.response;
    const { content } = validation.data;

    const comment = await commentService.addComment(findingId, content, userId);
    return ApiResponse.success('Comment added', comment);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to add comment', 'INTERNAL_ERROR', undefined, 500);
  }
}
