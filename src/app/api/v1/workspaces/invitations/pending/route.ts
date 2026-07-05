import { NextRequest } from 'next/server';

import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { invitationService } from '@/server/modules/invitations';

export async function GET(request: NextRequest) {
  logger.invitation.info('listPending');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const user = await authRepository.findUserById(auth.context.userId);
    if (!user) return ApiResponse.error('User not found', 'NOT_FOUND', undefined, 404);
    const invitations = await invitationService.listPending(user.email);
    logger.invitation.info('listPending completed', { count: invitations.length });
    return ApiResponse.success('Pending invitations retrieved', invitations);
  } catch (e) {
    logger.invitation.error('listPending failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
