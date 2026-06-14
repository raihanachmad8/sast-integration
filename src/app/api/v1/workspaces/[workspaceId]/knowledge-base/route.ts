import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { createKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base.schema';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { parsePagination, validateBody } from '@/server/http/validate';
import { knowledgeBaseService } from '@/server/modules/knowledge-base/knowledge-base.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('listKnowledgeEntries');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_READ);
  if (!workspace.success) return workspace.response;

  try {
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const source = request.nextUrl.searchParams.get('source') ?? undefined;
    const { page, perPage } = parsePagination(request.nextUrl.searchParams, { perPage: 25 });

    const result = await knowledgeBaseService.listByWorkspace(workspaceId, { search, source, page, perPage });
    logger.knowledge.info('listKnowledgeEntries completed', { total: result.total });
    return ApiResponse.paginated('Knowledge entries retrieved', result, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      totalPages: Math.ceil(result.total / result.perPage),
    });
  } catch (error) {
    logger.knowledge.error('listKnowledgeEntries failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('createKnowledgeEntry');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createKnowledgeEntrySchema);
  if (!validation.success) return validation.response;

  try {
    const entry = await knowledgeBaseService.createEntry(workspaceId, validation.data, auth.context.userId);
    logger.knowledge.info('createKnowledgeEntry completed');
    return ApiResponse.created('Knowledge entry created', entry);
  } catch (error) {
    logger.knowledge.error('createKnowledgeEntry failed', { error: error instanceof Error ? error.message : error });
    return handleKnowledgeError(error);
  }
}

function handleKnowledgeError(error: unknown) {
  if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
  if (error instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: error.issues }, 422);
  return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
}
