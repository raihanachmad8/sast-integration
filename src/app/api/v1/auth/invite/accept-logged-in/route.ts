import { NextRequest } from 'next/server';

import { acceptLoggedInSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { authService } from '@/server/modules/auth';
import { AUTH } from '@/server/modules/auth/constants';

export async function POST(request: NextRequest) {
  logger.auth.info('acceptInviteForLoggedInUser');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, acceptLoggedInSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await authService.acceptInviteForLoggedInUser(validation.data.token, auth.context.userId);
    logger.auth.info('acceptInviteForLoggedInUser completed');
    return ApiResponse.success(AUTH.MESSAGES.INVITE_ACCEPTED, result);
  } catch (e) {
    logger.auth.error('acceptInviteForLoggedInUser failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
