import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { createKnowledgeSourceSchema } from '@/commons/schemas/knowledge-base.schema';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { validateBody } from '@/server/http/validate';
import { knowledgeSourceService } from '@/server/modules/knowledge-base/knowledge-source.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('listKnowledgeSources');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_READ);
  if (!workspace.success) return workspace.response;

  try {
    const sources = await knowledgeSourceService.listSourcesByWorkspace(workspaceId);
    logger.knowledge.info('listKnowledgeSources completed');
    return ApiResponse.success('Knowledge sources retrieved', sources);
  } catch (error) {
    logger.knowledge.error('listKnowledgeSources failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('createKnowledgeSource');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createKnowledgeSourceSchema);
  if (!validation.success) return validation.response;

  try {
    const source = await knowledgeSourceService.createSource(workspaceId, validation.data, auth.context.userId);
    logger.knowledge.info('createKnowledgeSource completed');
    return ApiResponse.created('Knowledge source created', source);
  } catch (error) {
    logger.knowledge.error('createKnowledgeSource failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

function handleKnowledgeError(error: unknown) {
  if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
  if (error instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: error.issues }, 422);
  return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
}
