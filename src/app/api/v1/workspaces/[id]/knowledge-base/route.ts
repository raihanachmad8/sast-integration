import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { knowledgeBaseService } from '@/server/modules/knowledge-base/knowledge-base.service';
import { createKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base';
import { AppError } from '@/server/http/errors';
import { requirePermission, requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION, ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/knowledge-base
 * List all knowledge entries in a workspace.
 * Any workspace member can view entries.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const entries = await knowledgeBaseService.listByWorkspace(workspaceId);
    return ApiResponse.success('Knowledge entries retrieved', entries);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/knowledge-base
 * Create a new knowledge entry in the workspace.
 * Only Manager/Owner can create entries.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, createKnowledgeEntrySchema);
  if (!validation.success) return validation.response;

  try {
    const entry = await knowledgeBaseService.createEntry(workspaceId, validation.data);
    return ApiResponse.success('Knowledge entry created successfully', entry);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
