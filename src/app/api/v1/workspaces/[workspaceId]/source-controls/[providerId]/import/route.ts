import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { sourceControlImportService } from '@/server/modules/source-control/source-control-import.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; providerId: string }> };

const importRepoSchema = z.object({
  sourceRepositoryId: z.string().min(1, 'Source repository ID is required'),
  projectId: z.string().optional(),
});

/**
 * POST /api/v1/workspaces/:workspaceId/source-controls/:providerId/import
 * Import a discovered repository — creates local repo + provisions webhook + creates import record.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('post request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, importRepoSchema);
    if (!validation.success) return validation.response;
    const { sourceRepositoryId, projectId } = validation.data;

    const result = await sourceControlImportService.import(userId, workspaceId, {
      connectionId: providerId,
      sourceRepositoryId,
      projectId,
    });

    return ApiResponse.created('Repository imported', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to import repository', 'INTERNAL_ERROR', undefined, 500);
  }
}
