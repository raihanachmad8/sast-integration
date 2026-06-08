import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { updateKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base.schema';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { validateBody } from '@/server/http/validate';
import { knowledgeBaseService } from '@/server/modules/knowledge-base/knowledge-base.service';

type RouteContext = { params: Promise<{ workspaceId: string; entryId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, entryId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const entry = await knowledgeBaseService.getById(workspaceId, entryId);
    return ApiResponse.success('Knowledge entry retrieved', entry);
  } catch (error) {
    return handleKnowledgeError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, entryId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateKnowledgeEntrySchema);
  if (!validation.success) return validation.response;

  try {
    await knowledgeBaseService.getById(workspaceId, entryId);
    const entry = await knowledgeBaseService.updateEntry(entryId, validation.data, workspaceId, auth.context.userId);
    return ApiResponse.success('Knowledge entry updated', entry);
  } catch (error) {
    return handleKnowledgeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, entryId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await knowledgeBaseService.getById(workspaceId, entryId);
    await knowledgeBaseService.deleteEntry(entryId, workspaceId, auth.context.userId);
    return ApiResponse.noContent();
  } catch (error) {
    return handleKnowledgeError(error);
  }
}

function handleKnowledgeError(error: unknown) {
  if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
  if (error instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: error.issues }, 422);
  return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
}
