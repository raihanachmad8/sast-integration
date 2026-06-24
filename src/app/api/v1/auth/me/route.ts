import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { ROLE_PERMISSIONS } from '@/commons/constants/permissions';
import { AUTH } from '@/server/modules/auth/constants';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  logger.auth.info('me');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    // TODO: Create authService.getProfile(userId) to encapsulate user + workspace lookup
    const user = await authRepository.findUserById(auth.context.userId);
    if (!user) return ApiResponse.error(AUTH.ERRORS.USER_NOT_FOUND, AUTH.ERROR_CODE.AUTH, undefined, 401);

    let workspace = null;
    if (user.currentWorkspaceId) {
      // TODO: Create authService.getUserWorkspace(userId, workspaceId) to encapsulate workspace lookup
      const ws = await authRepository.getUserWorkspace(user.id, user.currentWorkspaceId);
      if (ws) {
        const permissions = ROLE_PERMISSIONS[ws.role as keyof typeof ROLE_PERMISSIONS] ?? [];
        workspace = { ...ws, permissions };
      }
    }

    logger.auth.info('me completed');
    return ApiResponse.success(AUTH.MESSAGES.SESSION_RETRIEVED, {
      sessionId: auth.context.sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: !!user.emailVerifiedAt,
        currentWorkspaceId: user.currentWorkspaceId,
      },
      workspace,
    });
  } catch (e) {
    logger.auth.error('me failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
