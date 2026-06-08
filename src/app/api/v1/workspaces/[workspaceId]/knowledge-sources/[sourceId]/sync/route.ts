import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { knowledgeSourceService } from '@/server/modules/knowledge-base/knowledge-source.service';

type RouteContext = { params: Promise<{ workspaceId: string; sourceId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await knowledgeSourceService.triggerSync(sourceId, workspaceId);
    return ApiResponse.success(result.message, result.result);
  } catch (error) {
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
