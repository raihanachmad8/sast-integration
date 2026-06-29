import { NextRequest } from 'next/server';

import { switchWorkspaceSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { workspaceService } from '@/server/modules/workspace';
import { WORKSPACE } from '@/server/modules/workspace/constants';

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
