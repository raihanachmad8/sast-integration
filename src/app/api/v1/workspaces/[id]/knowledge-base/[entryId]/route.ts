import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { knowledgeBaseService } from '@/server/modules/knowledge-base/knowledge-base.service';
import { updateKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; entryId: string }> };

/**
 * GET /api/v1/workspaces/:id/knowledge-base/:entryId
 * Get a single knowledge entry.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, entryId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const source = await knowledgeBaseService.getSourceForEntry(entryId);
    if (!source || source.workspace_id !== workspaceId) {
      return ApiResponse.error('Knowledge entry not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    const entry = await knowledgeBaseService.getEntryById(entryId);
    return ApiResponse.success('Knowledge entry retrieved', entry);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:id/knowledge-base/:entryId
 * Update a knowledge entry.
 * Only Manager/Owner can update.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, entryId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateKnowledgeEntrySchema);
  if (!validation.success) return validation.response;

  try {
    const source = await knowledgeBaseService.getSourceForEntry(entryId);
    if (!source || source.workspace_id !== workspaceId) {
      return ApiResponse.error('Knowledge entry not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    const updated = await knowledgeBaseService.updateEntry(entryId, validation.data);
    return ApiResponse.success('Knowledge entry updated successfully', updated);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/knowledge-base/:entryId
 * Delete a knowledge entry.
 * Only Manager/Owner can delete.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, entryId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const source = await knowledgeBaseService.getSourceForEntry(entryId);
    if (!source || source.workspace_id !== workspaceId) {
      return ApiResponse.error('Knowledge entry not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    await knowledgeBaseService.deleteEntry(entryId);
    return ApiResponse.success('Knowledge entry deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
