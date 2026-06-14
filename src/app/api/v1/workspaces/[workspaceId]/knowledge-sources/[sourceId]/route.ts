import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { updateKnowledgeSourceSchema } from '@/commons/schemas/knowledge-base.schema';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { validateBody } from '@/server/http/validate';
import { knowledgeSourceService } from '@/server/modules/knowledge-base/knowledge-source.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; sourceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('getKnowledgeSource');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_READ);
  if (!workspace.success) return workspace.response;

  try {
    const source = await knowledgeSourceService.getSourceById(sourceId, workspaceId);
    logger.knowledge.info('getKnowledgeSource completed');
    return ApiResponse.success('Knowledge source retrieved', source);
  } catch (error) {
    logger.knowledge.error('getKnowledgeSource failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('updateKnowledgeSource');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateKnowledgeSourceSchema);
  if (!validation.success) return validation.response;

  try {
    const source = await knowledgeSourceService.updateSource(sourceId, workspaceId, validation.data, auth.context.userId);
    logger.knowledge.info('updateKnowledgeSource completed');
    return ApiResponse.success('Knowledge source updated', source);
  } catch (error) {
    logger.knowledge.error('updateKnowledgeSource failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('deleteKnowledgeSource');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await knowledgeSourceService.deleteSource(sourceId, workspaceId, auth.context.userId);
    logger.knowledge.info('deleteKnowledgeSource completed');
    return ApiResponse.noContent();
  } catch (error) {
    logger.knowledge.error('deleteKnowledgeSource failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

function handleKnowledgeError(error: unknown) {
  if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
  if (error instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: error.issues }, 422);
  return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
}
