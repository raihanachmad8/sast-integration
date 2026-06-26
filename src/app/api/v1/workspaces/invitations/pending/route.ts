import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { AppError } from '@/server/http/errors';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  logger.workspace.info('listPendingInvitations');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const user = await authRepository.findUserById(auth.context.userId);
    if (!user) return ApiResponse.error('User not found', 'NOT_FOUND', undefined, 404);
    const invitations = await workspaceService.listPendingInvitations(user.email);
    logger.workspace.info('listPendingInvitations completed', { count: invitations.length });
    return ApiResponse.success(WORKSPACE.MESSAGES.INVITATIONS_LIST, invitations);
  } catch (e) {
    logger.workspace.error('listPendingInvitations failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
