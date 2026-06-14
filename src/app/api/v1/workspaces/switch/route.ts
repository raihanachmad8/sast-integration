import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { z } from 'zod';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

const switchWorkspaceSchema = z.object({ currentWorkspaceId: z.string().min(1) });

export async function POST(request: NextRequest) {
  logger.workspace.info('switchWorkspace');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, switchWorkspaceSchema);
  if (!validation.success) return validation.response;

  try {
    await workspaceService.switchWorkspace(validation.data.currentWorkspaceId, auth.context.userId);
    logger.workspace.info('switchWorkspace completed');
    return ApiResponse.success(WORKSPACE.MESSAGES.SWITCHED, { currentWorkspaceId: validation.data.currentWorkspaceId });
  } catch (e) {
    logger.workspace.error('switchWorkspace failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
