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
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; entryId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('getKnowledgeEntry');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, entryId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_READ);
  if (!workspace.success) return workspace.response;

  try {
    const entry = await knowledgeBaseService.getById(workspaceId, entryId);
    logger.knowledge.info('getKnowledgeEntry completed');
    return ApiResponse.success('Knowledge entry retrieved', entry);
  } catch (error) {
    logger.knowledge.error('getKnowledgeEntry failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('updateKnowledgeEntry');
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
    logger.knowledge.info('updateKnowledgeEntry completed');
    return ApiResponse.success('Knowledge entry updated', entry);
  } catch (error) {
    logger.knowledge.error('updateKnowledgeEntry failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('deleteKnowledgeEntry');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, entryId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await knowledgeBaseService.getById(workspaceId, entryId);
    await knowledgeBaseService.deleteEntry(entryId, workspaceId, auth.context.userId);
    logger.knowledge.info('deleteKnowledgeEntry completed');
    return ApiResponse.noContent();
  } catch (error) {
    logger.knowledge.error('deleteKnowledgeEntry failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

function handleKnowledgeError(error: unknown) {
  if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
  if (error instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: error.issues }, 422);
  return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
}
